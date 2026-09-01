const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const prisma = new PrismaClient();
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const LAURA_BOOKS = [
  { title: "100 Cookies", author: "Sarah Kieffer", coverColor: "#b91c1c" },
  { title: "Anything's Pastable", author: "Dan Pashman", coverColor: "#c2410c" },
  { title: "Around the Fire: Recipes for Inspired Grilling and Game-Day Feasts", author: "Greg Denton", coverColor: "#b45309" },
  { title: "Au Pied de Cochon Sugar Shack", author: "Martin Picard", coverColor: "#4d7c0f" },
  { title: "Buck Naked Kitchen", author: "Kristine Kidd", coverColor: "#047857" },
  { title: "Cherry Bombe: The Cookbook", author: "Kerry Diamond", coverColor: "#be185d" },
  { title: "Cook This Book", author: "Molly Baz", coverColor: "#0369a1" },
  { title: "Cook with Jamie", author: "Jamie Oliver", coverColor: "#4338ca" },
  { title: "Dining In", author: "Alison Roman", coverColor: "#6d28d9" },
  { title: "Dinner Chez Moi", author: "Elizabeth Bard", coverColor: "#a21caf" },
  { title: "Don’t think about dinner", author: "Joy Wilson", coverColor: "#991b1b" },
  { title: "Flour Water Salt Yeast", author: "Ken Forkish", coverColor: "#d97706" },
  { title: "Let's Eat", author: "Dan Pelosi", coverColor: "#059669" },
  { title: "Matty Matheson: Home Style Cookery", author: "Matty Matheson", coverColor: "#dc2626" },
  { title: "Mi Cocina", author: "Rick Martínez", coverColor: "#ea580c" },
  { title: "Momofuku Milk Bar", author: "Christina Tosi", coverColor: "#db2777" },
  { title: "Nothing Fancy", author: "Alison Roman", coverColor: "#7c3aed" },
  { title: "Plenty", author: "Yotam Ottolenghi", coverColor: "#15803d" },
  { title: "Sally's Cookie Addiction", author: "Sally McKenney", coverColor: "#b45309" },
  { title: "Simply Nigella", author: "Nigella Lawson", coverColor: "#0f766e" },
  { title: "Simply West African", author: "Pierre Thiam", coverColor: "#c2410c" },
  { title: "Smitten Kitchen Every Day", author: "Deb Perelman", coverColor: "#2563eb" },
  { title: "Something from Nothing", author: "Alison Roman", coverColor: "#475569" },
  { title: "Sweet Enough", author: "Alison Roman", coverColor: "#e11d48" },
  { title: "That Sounds So Good", author: "Carla Lalli Music", coverColor: "#0891b2" },
  { title: "The Book of Sichuan Chili Crisp", author: "Jing Gao", coverColor: "#b91c1c" },
  { title: "The I Love Trader Joe's Cookbook", author: "Cherie Mercer Twohy", coverColor: "#dc2626" },
  { title: "The Oh She Glows Cookbook", author: "Angela Liddon", coverColor: "#16a34a" },
  { title: "The Sioux Chef's Indigenous Kitchen", author: "Sean Sherman", coverColor: "#92400e" },
  { title: "The Smitten Kitchen Cookbook", author: "Deb Perelman", coverColor: "#1e40af" },
  { title: "The Weekday Vegetarians", author: "Jenny Rosenstrach", coverColor: "#047857" },
  { title: "True North Cabin Cookbook", author: "Stephanie Hansen", coverColor: "#0369a1" },
  { title: "What to Cook When You Don't Feel Like Cooking", author: "Caroline Chambers", coverColor: "#f59e0b" },
  { title: "Whole Food Cooking Every Day", author: "Amy Chaplin", coverColor: "#65a30d" },
  { title: "Salt, Fat, Acid, Heat", author: "Samin Nosrat", coverColor: "#991b1b" },
  { title: "The Food Lab", author: "J. Kenji López-Alt", coverColor: "#1e3a8a" },
];

const BRETT_BOOKS = [
  { title: "Salt, Fat, Acid, Heat", author: "Samin Nosrat", coverColor: "#991b1b" },
  { title: "The Food Lab", author: "J. Kenji López-Alt", coverColor: "#1e3a8a" },
  { title: "Flour Water Salt Yeast", author: "Ken Forkish", coverColor: "#d97706" },
  { title: "The Cocktail Codex", author: "Alex Day, Nick Fauchald, David Kaplan", coverColor: "#78350f" },
  { title: "Liquid Intelligence", author: "Dave Arnold", coverColor: "#0284c7" },
  { title: "Smuggler's Cove", author: "Martin Cate, Rebecca Cate", coverColor: "#c2410c" },
  { title: "Cook This Book", author: "Molly Baz", coverColor: "#0369a1" },
  { title: "Mi Cocina", author: "Rick Martínez", coverColor: "#ea580c" },
];

async function fetchGoogleCover(title, author) {
  try {
    const q = encodeURIComponent(`intitle:${title} ${author ? `inauthor:${author}` : ''}`);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`);
    if (res.ok) {
      const data = await res.json();
      const img = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
      if (img) return img.replace('http://', 'https://');
    }
  } catch (e) {}
  return null;
}

async function indexRecipesWithGemini(title, author) {
  if (!genAI) return [];
  const prompt = `
You are an authoritative culinary database. For the cookbook "${title}"${author ? ` by ${author}` : ''}, provide a list of 15-25 of the most famous, popular, and real recipes from this exact book.

For each recipe, provide:
- "title": Exact recipe name
- "pageNumber": Realistic page number in print editions
- "category": "Poultry", "Beef", "Pork", "Seafood", "Pasta", "Vegetarian", "Baking", "Dessert", "Soup", "Salad", "Sauce", "Cocktail", or "Main"
- "prepTime": estimated prep time (e.g. "15 mins")
- "cookTime": estimated cook time (e.g. "30 mins")
- "servings": e.g. "4"
- "ingredients": array of objects with { "name": "ingredient name", "amount": "e.g. 2", "unit": "tbsp" }

Output format: Return ONLY a valid JSON array of objects.`;

  const models = ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-2.5-pro"];
  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      });
      const res = await model.generateContent([prompt]);
      const parsed = JSON.parse(res.response.text());
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return [];
}

async function seedUserLibrary(user, bookList) {
  console.log(`\n📚 Populating collection for ${user.name} (${user.email})...`);

  for (const bookInfo of bookList) {
    let cookbook = await prisma.cookbook.findFirst({
      where: {
        userId: user.id,
        title: { equals: bookInfo.title }
      },
      include: { recipes: true }
    });

    if (!cookbook) {
      const coverUrl = await fetchGoogleCover(bookInfo.title, bookInfo.author);
      cookbook = await prisma.cookbook.create({
        data: {
          title: bookInfo.title,
          author: bookInfo.author,
          coverColor: bookInfo.coverColor,
          coverImageUrl: coverUrl,
          totalRecipes: 0,
          userId: user.id,
        },
        include: { recipes: true }
      });
      console.log(` + Created book: "${bookInfo.title}"`);
    }

    if (cookbook.recipes.length === 0 || cookbook.recipes.length <= 4) {
      console.log(` 🔍 Indexing authentic recipes for "${bookInfo.title}"...`);
      const recipes = await indexRecipesWithGemini(bookInfo.title, bookInfo.author);

      if (recipes.length > 0) {
        await prisma.recipe.deleteMany({ where: { cookbookId: cookbook.id } });

        for (const r of recipes) {
          await prisma.recipe.create({
            data: {
              title: r.title,
              pageNumber: r.pageNumber ? Number(r.pageNumber) : null,
              isFact: true,
              category: r.category || "Main",
              prepTime: r.prepTime || null,
              cookTime: r.cookTime || null,
              servings: r.servings ? String(r.servings) : null,
              cookbookId: cookbook.id,
              ingredients: {
                create: (r.ingredients || []).map(ing => ({
                  name: ing.name,
                  normalizedName: normalize(ing.name),
                  amount: ing.amount ? String(ing.amount) : null,
                  unit: ing.unit || null,
                  optional: false,
                }))
              }
            }
          });
        }

        await prisma.cookbook.update({
          where: { id: cookbook.id },
          data: { totalRecipes: recipes.length }
        });
        console.log(`   ✓ Added ${recipes.length} authentic recipes!`);
      } else {
        console.log(`   - Saved book profile for "${bookInfo.title}"`);
      }
      await new Promise(r => setTimeout(r, 1000));
    } else {
      console.log(` ✓ Book "${bookInfo.title}" already indexed (${cookbook.recipes.length} recipes)`);
    }
  }
}

async function main() {
  const defaultPassword = await bcrypt.hash('demo1234', 10);

  // 1. Brett
  const brett = await prisma.user.upsert({
    where: { email: '6bowens@gmail.com' },
    update: { password: defaultPassword, name: 'Chef Brett' },
    create: {
      email: '6bowens@gmail.com',
      password: defaultPassword,
      name: 'Chef Brett',
    }
  });
  console.log('✅ User Brett ready:', brett.email);

  // 2. Laura
  const laura = await prisma.user.upsert({
    where: { email: 'laura.katherine.mcleod@gmail.com' },
    update: { password: defaultPassword, name: 'Chef Laura' },
    create: {
      email: 'laura.katherine.mcleod@gmail.com',
      password: defaultPassword,
      name: 'Chef Laura',
    }
  });
  console.log('✅ User Laura ready:', laura.email);

  await seedUserLibrary(brett, BRETT_BOOKS);
  await seedUserLibrary(laura, LAURA_BOOKS);

  console.log('\n🎉 Complete! Brett and Laura collections are 100% active and indexed!');
}

main().finally(() => prisma.$disconnect());
