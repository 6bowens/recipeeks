const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function normalize(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

async function main() {
  const existingUsers = await prisma.user.count();
  const existingCookbooks = await prisma.cookbook.count();
  if (existingUsers > 0 && existingCookbooks > 0) {
    console.log('Database already populated, skipping seed.');
    return;
  }

  console.log('Seeding initial data...');

  // Create demo chef account
  const hashedPassword = await bcrypt.hash('demo1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@recipeeks.app' },
    update: {},
    create: {
      email: 'demo@recipeeks.app',
      password: hashedPassword,
      name: 'Chef Brett',
    },
  });

  console.log('User created:', user.email);

  // 1. Add Salt, Fat, Acid, Heat
  const sfah = await prisma.cookbook.create({
    data: {
      title: 'Salt, Fat, Acid, Heat',
      author: 'Samin Nosrat',
      edition: 'Hardcover',
      coverColor: '#991b1b',
      coverImageUrl: 'https://books.google.com/books/content?id=yZ0qDwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
      spineSnippet: 'Mastering the Elements of Good Cooking',
      totalRecipes: 4,
      userId: user.id,
      recipes: {
        create: [
          {
            title: 'Buttermilk-Brined Roast Chicken',
            pageNumber: 338,
            isFact: true,
            category: 'Poultry',
            prepTime: '15 mins',
            cookTime: '60 mins',
            servings: '4-6',
            sourceUrl: 'https://www.saltfatacidheat.com/fat/buttermilk-marinated-roast-chicken',
            ingredients: {
              create: [
                { name: 'Whole chicken (approx 4 lbs)', normalizedName: normalize('whole chicken'), amount: '1', unit: 'chicken' },
                { name: 'Buttermilk', normalizedName: normalize('buttermilk'), amount: '2', unit: 'cups' },
                { name: 'Kosher salt', normalizedName: normalize('kosher salt'), amount: '2', unit: 'tbsp' },
              ],
            },
          },
          {
            title: 'Samin’s Classic Salsa Verde',
            pageNumber: 370,
            isFact: true,
            category: 'Sauces',
            prepTime: '15 mins',
            cookTime: '0 mins',
            servings: '1 cup',
            ingredients: {
              create: [
                { name: 'Fresh flat-leaf parsley', normalizedName: normalize('parsley'), amount: '1', unit: 'cup' },
                { name: 'Capers', normalizedName: normalize('capers'), amount: '2', unit: 'tbsp' },
                { name: 'Anchovy fillets', normalizedName: normalize('anchovy'), amount: '3', unit: 'fillets' },
                { name: 'Garlic', normalizedName: normalize('garlic'), amount: '1', unit: 'clove' },
                { name: 'Extra-virgin olive oil', normalizedName: normalize('olive oil'), amount: '1/2', unit: 'cup' },
                { name: 'Red wine vinegar', normalizedName: normalize('red wine vinegar'), amount: '1', unit: 'tbsp' },
              ],
            },
          },
          {
            title: 'Slow-Cooked Tuscan Kale and White Beans',
            pageNumber: 220,
            isFact: true,
            category: 'Vegetarian',
            prepTime: '15 mins',
            cookTime: '45 mins',
            servings: '4',
            ingredients: {
              create: [
                { name: 'Lacinato kale', normalizedName: normalize('kale'), amount: '2', unit: 'bunches' },
                { name: 'Cannellini beans', normalizedName: normalize('cannellini beans'), amount: '2', unit: 'cans' },
                { name: 'Garlic', normalizedName: normalize('garlic'), amount: '4', unit: 'cloves' },
                { name: 'Olive oil', normalizedName: normalize('olive oil'), amount: '3', unit: 'tbsp' },
                { name: 'Crushed red pepper flakes', normalizedName: normalize('red pepper flakes'), amount: '1/2', unit: 'tsp' },
              ],
            },
          },
        ],
      },
    },
  });

  // 2. Add The Food Lab
  const foodLab = await prisma.cookbook.create({
    data: {
      title: 'The Food Lab',
      author: 'J. Kenji López-Alt',
      edition: '1st Edition',
      coverColor: '#881337',
      coverImageUrl: 'https://books.google.com/books/content?id=5j3pBQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
      spineSnippet: 'Better Home Cooking Through Science',
      totalRecipes: 3,
      userId: user.id,
      recipes: {
        create: [
          {
            title: 'The Ultimate Ultra-Crispy Roast Potatoes',
            pageNumber: 492,
            isFact: true,
            category: 'Sides',
            prepTime: '15 mins',
            cookTime: '50 mins',
            servings: '6',
            ingredients: {
              create: [
                { name: 'Yukon Gold potatoes', normalizedName: normalize('potatoes'), amount: '4', unit: 'lbs' },
                { name: 'Kosher salt', normalizedName: normalize('kosher salt'), amount: '2', unit: 'tbsp' },
                { name: 'Baking soda', normalizedName: normalize('baking soda'), amount: '1/2', unit: 'tsp' },
                { name: 'Olive oil', normalizedName: normalize('olive oil'), amount: '5', unit: 'tbsp' },
                { name: 'Fresh rosemary', normalizedName: normalize('rosemary'), amount: '1', unit: 'tbsp' },
                { name: 'Garlic', normalizedName: normalize('garlic'), amount: '3', unit: 'cloves' },
                { name: 'Black pepper', normalizedName: normalize('black pepper'), amount: '1/2', unit: 'tsp' },
              ],
            },
          },
          {
            title: '15-Minute Creamy Stovetop Macaroni and Cheese',
            pageNumber: 715,
            isFact: true,
            category: 'Pasta',
            prepTime: '5 mins',
            cookTime: '10 mins',
            servings: '4',
            ingredients: {
              create: [
                { name: 'Elbow macaroni', normalizedName: normalize('macaroni'), amount: '6', unit: 'oz' },
                { name: 'Evaporated milk', normalizedName: normalize('evaporated milk'), amount: '6', unit: 'oz' },
                { name: 'Sharp cheddar cheese', normalizedName: normalize('cheddar cheese'), amount: '6', unit: 'oz' },
                { name: 'Kosher salt', normalizedName: normalize('kosher salt'), amount: '1/2', unit: 'tsp' },
              ],
            },
          },
        ],
      },
    },
  });

  // 3. Add initial pantry items and staples
  const pantry = [
    { name: 'Kosher Salt', category: 'spices', isAlwaysAvailable: true },
    { name: 'Black Pepper', category: 'spices', isAlwaysAvailable: true },
    { name: 'Extra-Virgin Olive Oil', category: 'pantry', isAlwaysAvailable: true },
    { name: 'Fresh Garlic', category: 'pantry', isAlwaysAvailable: true },
    { name: 'Unsalted Butter', category: 'fridge', isAlwaysAvailable: true },
    { name: 'Yukon Gold Potatoes', category: 'pantry', isAlwaysAvailable: false, quantity: '5 lbs' },
    { name: 'Fresh Rosemary', category: 'fridge', isAlwaysAvailable: false, quantity: '1 bunch' },
    { name: 'Baking Soda', category: 'pantry', isAlwaysAvailable: true },
    { name: 'Whole Chicken', category: 'fridge', isAlwaysAvailable: false, quantity: '1 bird' },
    { name: 'Buttermilk', category: 'fridge', isAlwaysAvailable: false, quantity: '1 quart' },
    { name: 'Elbow Macaroni', category: 'pantry', isAlwaysAvailable: false, quantity: '2 boxes' },
    { name: 'Sharp Cheddar Cheese', category: 'fridge', isAlwaysAvailable: false, quantity: '8 oz' },
    { name: 'Evaporated Milk', category: 'pantry', isAlwaysAvailable: false, quantity: '1 can' },
  ];

  for (const item of pantry) {
    await prisma.pantryItem.create({
      data: {
        name: item.name,
        normalizedName: normalize(item.name),
        category: item.category,
        quantity: item.quantity || null,
        isAlwaysAvailable: item.isAlwaysAvailable,
        userId: user.id,
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
