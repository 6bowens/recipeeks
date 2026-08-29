const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RECIPES = [
  {
    title: 'Peanut Butter Noodles (Chicken & Dumplings)',
    frequency: '1_week',
    servings: '2-4',
    cookTime: '20 mins',
    notes: 'Serve with pan-fried chicken cutlets or crispy pork/veggie dumplings.',
    instructions: JSON.stringify([
      'Boil fresh wheat noodles according to package directions, reserving 1/2 cup cooking water.',
      'Pan-fry chicken cutlets or dumplings in sesame oil until golden and cooked through.',
      'Whisk peanut butter, soy sauce, rice vinegar, sesame oil, honey, sriracha, minced garlic, and warm noodle water.',
      'Toss noodles in sauce, top with chicken/dumplings, scallions, sesame seeds, and chili flakes.'
    ]),
    ingredients: [
      { name: 'fresh wheat noodles', amount: '2', unit: 'bundles', aisleCategory: 'pantry' },
      { name: 'chicken cutlets or dumplings', amount: '1', unit: 'lb', aisleCategory: 'meat' },
      { name: 'peanut butter', amount: '1', unit: 'cup', aisleCategory: 'pantry' },
      { name: 'soy sauce', amount: '4', unit: 'tbsp', aisleCategory: 'pantry' },
      { name: 'rice wine vinegar', amount: '2', unit: 'tsp', aisleCategory: 'pantry' },
      { name: 'sesame oil', amount: '2', unit: 'tsp', aisleCategory: 'pantry' },
      { name: 'honey', amount: '3', unit: 'tbsp', aisleCategory: 'pantry' },
      { name: 'garlic', amount: '4', unit: 'cloves', aisleCategory: 'produce' },
      { name: 'sriracha', amount: '1', unit: 'tsp', aisleCategory: 'pantry' },
      { name: 'scallions', amount: '3', unit: 'stalks', aisleCategory: 'produce' }
    ]
  },
  {
    title: 'Fresh Pasta with Garlic Herb Butter',
    frequency: '1_week',
    servings: '4',
    cookTime: '25 mins',
    notes: 'Silky pasta tossed in emulsified garlic butter, fresh parsley, and Parmigiano-Reggiano.',
    instructions: JSON.stringify([
      'Bring a large pot of salted water to a rolling boil and cook pasta until al dente (save 1 cup pasta water).',
      'In a large skillet over medium-low heat, melt butter with thinly sliced garlic until fragrant.',
      'Toss hot pasta directly into the garlic butter, splashing with pasta water and stirring vigorously to create a silky emulsion.',
      'Fold in finely chopped Italian parsley, freshly grated Parmesan, cracked black pepper, and sea salt.'
    ]),
    ingredients: [
      { name: 'fettuccine or tagliatelle pasta', amount: '1', unit: 'lb', aisleCategory: 'pantry' },
      { name: 'unsalted butter', amount: '6', unit: 'tbsp', aisleCategory: 'dairy' },
      { name: 'garlic', amount: '6', unit: 'cloves', aisleCategory: 'produce' },
      { name: 'Parmesan cheese', amount: '1', unit: 'cup', aisleCategory: 'dairy' },
      { name: 'fresh Italian parsley', amount: '1/2', unit: 'cup', aisleCategory: 'produce' },
      { name: 'cracked black pepper', amount: '1', unit: 'tsp', aisleCategory: 'spices' },
      { name: 'flaky sea salt', amount: '1/2', unit: 'tsp', aisleCategory: 'spices' }
    ]
  },
  {
    title: 'Classic Baked Lasagna',
    frequency: '2_month',
    servings: '6-8',
    cookTime: '1 hour 15 mins',
    notes: 'Layered with slow-cooked meat ragù, seasoned whole milk ricotta, and bubbly golden mozzarella.',
    instructions: JSON.stringify([
      'Brown ground beef and Italian sausage with diced onions and garlic; stir in crushed tomatoes, oregano, and simmer for 20 mins.',
      'In a bowl, mix ricotta, 1 egg, 1/2 cup Parmesan, chopped basil, salt, and black pepper.',
      'In a 9x13 baking dish, layer meat sauce, lasagna sheets, seasoned ricotta, and shredded mozzarella (repeat 3-4 layers).',
      'Top with remaining mozzarella and Parmesan. Bake covered at 375°F (190°C) for 30 mins, then uncovered for 15 mins until golden and bubbly.'
    ]),
    ingredients: [
      { name: 'lasagna pasta sheets', amount: '12', unit: 'sheets', aisleCategory: 'pantry' },
      { name: 'ground beef', amount: '1', unit: 'lb', aisleCategory: 'meat' },
      { name: 'ground Italian pork sausage', amount: '1/2', unit: 'lb', aisleCategory: 'meat' },
      { name: 'crushed San Marzano tomatoes', amount: '28', unit: 'oz', aisleCategory: 'pantry' },
      { name: 'whole milk ricotta cheese', amount: '15', unit: 'oz', aisleCategory: 'dairy' },
      { name: 'shredded mozzarella cheese', amount: '3', unit: 'cups', aisleCategory: 'dairy' },
      { name: 'Parmesan cheese', amount: '1', unit: 'cup', aisleCategory: 'dairy' },
      { name: 'garlic', amount: '4', unit: 'cloves', aisleCategory: 'produce' },
      { name: 'yellow onion', amount: '1', unit: 'medium', aisleCategory: 'produce' },
      { name: 'fresh basil', amount: '1/4', unit: 'cup', aisleCategory: 'produce' },
      { name: 'egg', amount: '1', unit: 'large', aisleCategory: 'dairy' }
    ]
  },
  {
    title: 'Potato Gnocchi with Brown Butter & Crispy Sage',
    frequency: '2_month',
    servings: '4',
    cookTime: '20 mins',
    notes: 'Pan-seared pillow-soft gnocchi tossed in nutty brown butter, aromatic crispy sage, and Pecorino.',
    instructions: JSON.stringify([
      'Cook potato gnocchi in boiling salted water until they float to the top (2-3 mins); drain.',
      'In a wide skillet, melt butter over medium heat until it foams and turns nutty golden brown.',
      'Drop in fresh sage leaves and fry for 1-2 minutes until crisp; transfer sage to a paper towel.',
      'Add gnocchi to the brown butter skillet and pan-sear for 3-4 mins until edges are golden crisp.',
      'Toss with grated Pecorino Romano and freshly ground black pepper, then top with the crispy sage.'
    ]),
    ingredients: [
      { name: 'potato gnocchi', amount: '1', unit: 'lb', aisleCategory: 'pantry' },
      { name: 'unsalted butter', amount: '6', unit: 'tbsp', aisleCategory: 'dairy' },
      { name: 'fresh sage leaves', amount: '15', unit: 'leaves', aisleCategory: 'produce' },
      { name: 'Pecorino Romano or Parmesan', amount: '3/4', unit: 'cup', aisleCategory: 'dairy' },
      { name: 'garlic', amount: '2', unit: 'cloves', aisleCategory: 'produce' },
      { name: 'black pepper', amount: '1/2', unit: 'tsp', aisleCategory: 'spices' }
    ]
  },
  {
    title: 'Roasted Butternut Squash & Whipped Feta Pasta',
    frequency: '2_month',
    servings: '4',
    cookTime: '40 mins',
    notes: 'Caramelized roasted butternut squash pureed with creamy feta, garlic, and fresh thyme over rigatoni.',
    instructions: JSON.stringify([
      'Toss cubed butternut squash with olive oil, salt, pepper, and fresh thyme; roast at 400°F (200°C) for 25 mins until tender and caramelized.',
      'Cook rigatoni pasta until al dente, reserving 1 cup pasta cooking water.',
      'Blend roasted squash, block of feta cheese, sautéed garlic, a splash of heavy cream, and warm pasta water in a blender until velvety smooth.',
      'Toss hot pasta in the velvety squash-feta sauce and garnish with toasted pine nuts and crumbled feta.'
    ]),
    ingredients: [
      { name: 'rigatoni or penne pasta', amount: '1', unit: 'lb', aisleCategory: 'pantry' },
      { name: 'butternut squash (cubed)', amount: '1', unit: 'medium', aisleCategory: 'produce' },
      { name: 'feta cheese (block)', amount: '8', unit: 'oz', aisleCategory: 'dairy' },
      { name: 'heavy cream or whole milk', amount: '1/3', unit: 'cup', aisleCategory: 'dairy' },
      { name: 'garlic', amount: '4', unit: 'cloves', aisleCategory: 'produce' },
      { name: 'fresh thyme', amount: '1', unit: 'tbsp', aisleCategory: 'produce' },
      { name: 'olive oil', amount: '3', unit: 'tbsp', aisleCategory: 'pantry' },
      { name: 'pine nuts (toasted)', amount: '3', unit: 'tbsp', aisleCategory: 'pantry' }
    ]
  },
  {
    title: 'Tuscan White Beans on Garlic Toast',
    frequency: '1_week',
    servings: '3-4',
    cookTime: '20 mins',
    notes: 'Creamy braised cannellini beans with rosemary and garlic spooned over crusty olive-oil-rubbed sourdough.',
    instructions: JSON.stringify([
      'Warm olive oil in a skillet over medium-low heat; add sliced garlic, rosemary sprigs, and red pepper flakes until fragrant (2 mins).',
      'Add drained cannellini beans and 1/3 cup vegetable broth; gently simmer and crush a third of the beans with a fork to thicken.',
      'Grill or toast thick sourdough slices, then rub immediately with a cut raw garlic clove and drizzle generously with extra virgin olive oil.',
      'Spoon warm creamy beans over toasted bread, finish with flaky sea salt and fresh lemon zest.'
    ]),
    ingredients: [
      { name: 'cannellini or white beans', amount: '2', unit: 'cans', aisleCategory: 'pantry' },
      { name: 'sourdough bread', amount: '1', unit: 'loaf', aisleCategory: 'pantry' },
      { name: 'extra virgin olive oil', amount: '1/4', unit: 'cup', aisleCategory: 'pantry' },
      { name: 'garlic', amount: '6', unit: 'cloves', aisleCategory: 'produce' },
      { name: 'fresh rosemary', amount: '2', unit: 'sprigs', aisleCategory: 'produce' },
      { name: 'vegetable broth', amount: '1/3', unit: 'cup', aisleCategory: 'pantry' },
      { name: 'red pepper flakes', amount: '1/4', unit: 'tsp', aisleCategory: 'spices' },
      { name: 'lemon', amount: '1', unit: 'whole', aisleCategory: 'produce' }
    ]
  },
  {
    title: 'Cast-Iron Artisan Pizza',
    frequency: '1_week',
    servings: '3-4',
    cookTime: '25 mins',
    notes: 'Crispy, airy crust baked in a screaming-hot cast-iron pan with fresh mozzarella, basil, and spicy pepperoni.',
    instructions: JSON.stringify([
      'Preheat oven to 500°F (260°C) with a cast-iron skillet inside.',
      'Stretch pizza dough on an oiled surface to fit the skillet.',
      'Carefully place dough in hot skillet; spread seasoned tomato sauce, fresh mozzarella chunks, and pepperoni slices.',
      'Cook 2 mins on stovetop over high heat to set the bottom crust, then transfer to oven and bake 10-12 mins until blistered and bubbly.',
      'Top with fresh torn basil leaves, hot honey drizzle, and grated Parmesan.'
    ]),
    ingredients: [
      { name: 'pizza dough', amount: '1', unit: 'lb', aisleCategory: 'pantry' },
      { name: 'San Marzano pizza sauce', amount: '3/4', unit: 'cup', aisleCategory: 'pantry' },
      { name: 'fresh mozzarella cheese', amount: '8', unit: 'oz', aisleCategory: 'dairy' },
      { name: 'pepperoni slices', amount: '4', unit: 'oz', aisleCategory: 'meat' },
      { name: 'fresh basil', amount: '1/4', unit: 'cup', aisleCategory: 'produce' },
      { name: 'olive oil', amount: '2', unit: 'tbsp', aisleCategory: 'pantry' },
      { name: 'hot honey or red pepper flakes', amount: '1', unit: 'tbsp', aisleCategory: 'pantry' }
    ]
  },
  {
    title: 'Crispy Shredded Beef Tacos',
    frequency: '1_week',
    servings: '4',
    cookTime: '30 mins',
    notes: 'Pan-crisped corn tortillas stuffed with seasoned shredded beef, melted cheddar-jack, cilantro, and lime.',
    instructions: JSON.stringify([
      'Season shredded beef with cumin, chili powder, garlic powder, onion powder, and a squeeze of lime.',
      'Dip corn tortillas lightly in beef pan drippings or oil, place on a hot griddle/skillet.',
      'Top half of each tortilla with shredded cheese and seasoned beef; fold over and press down.',
      'Fry 2-3 mins per side until golden brown and super crispy.',
      'Serve with diced white onions, fresh cilantro, lime wedges, and salsa.'
    ]),
    ingredients: [
      { name: 'corn tortillas', amount: '12', unit: 'count', aisleCategory: 'pantry' },
      { name: 'shredded beef or ground beef', amount: '1.5', unit: 'lbs', aisleCategory: 'meat' },
      { name: 'Mexican cheese blend or cheddar', amount: '2', unit: 'cups', aisleCategory: 'dairy' },
      { name: 'white onion (diced)', amount: '1', unit: 'medium', aisleCategory: 'produce' },
      { name: 'fresh cilantro', amount: '1/2', unit: 'bunch', aisleCategory: 'produce' },
      { name: 'limes', amount: '2', unit: 'whole', aisleCategory: 'produce' },
      { name: 'taco seasoning (cumin, chili powder)', amount: '2', unit: 'tbsp', aisleCategory: 'spices' }
    ]
  },
  {
    title: 'Braised Beef Short Ribs in Red Wine',
    frequency: '1_month',
    servings: '4',
    cookTime: '2.5 hours',
    notes: 'Melt-in-your-mouth tender short ribs braised low and slow with Cabernet, fresh aromatics, and rich beef reduction.',
    instructions: JSON.stringify([
      'Season short ribs generously with salt and pepper. Sear in a heavy Dutch oven over high heat until deeply browned on all sides (8 mins); remove.',
      'In the same pot, sauté diced onions, carrots, and celery until softened (5 mins); stir in tomato paste and garlic for 1 min.',
      'Pour in red wine, scraping up all browned bits from bottom of pot; simmer until wine reduces by half.',
      'Return short ribs to pot, add beef broth, thyme, and rosemary sprigs. Cover and braise in oven at 325°F (165°C) for 2 to 2.5 hours until fork-tender.',
      'Strain braising liquid and simmer to reduce into a glossy sauce; spoon over ribs.'
    ]),
    ingredients: [
      { name: 'bone-in beef short ribs', amount: '3', unit: 'lbs', aisleCategory: 'meat' },
      { name: 'dry red wine (Cabernet)', amount: '2', unit: 'cups', aisleCategory: 'pantry' },
      { name: 'beef broth', amount: '2', unit: 'cups', aisleCategory: 'pantry' },
      { name: 'tomato paste', amount: '2', unit: 'tbsp', aisleCategory: 'pantry' },
      { name: 'yellow onions (chopped)', amount: '2', unit: 'medium', aisleCategory: 'produce' },
      { name: 'carrots (chopped)', amount: '3', unit: 'medium', aisleCategory: 'produce' },
      { name: 'celery stalks (chopped)', amount: '3', unit: 'stalks', aisleCategory: 'produce' },
      { name: 'garlic', amount: '6', unit: 'cloves', aisleCategory: 'produce' },
      { name: 'fresh thyme & rosemary', amount: '4', unit: 'sprigs', aisleCategory: 'produce' }
    ]
  },
  {
    title: 'French Onion Pot Roast',
    frequency: '2_month',
    servings: '6',
    cookTime: '3 hours',
    notes: 'Chuck roast braised in rich caramelized onion broth, topped with melted Gruyère cheese.',
    instructions: JSON.stringify([
      'Melt 2 tbsp butter in a Dutch oven, add sliced sweet onions, and cook slowly over medium-low heat for 25-30 mins until deep amber and caramelized.',
      'Season chuck roast with salt, pepper, and garlic powder; sear separately in hot pan until browned on all sides.',
      'Deglaze onions with beef broth, Worcestershire sauce, and red wine; add fresh thyme and bay leaves.',
      'Nestle chuck roast into caramelized onion mixture, cover tightly, and bake at 300°F (150°C) for 3 hours until pull-apart tender.',
      'Top with shredded Gruyère or Swiss cheese and broil for 3 mins until melted and bubbly.'
    ]),
    ingredients: [
      { name: 'beef chuck roast', amount: '3.5', unit: 'lbs', aisleCategory: 'meat' },
      { name: 'sweet yellow onions (thinly sliced)', amount: '4', unit: 'large', aisleCategory: 'produce' },
      { name: 'beef broth', amount: '3', unit: 'cups', aisleCategory: 'pantry' },
      { name: 'butter', amount: '3', unit: 'tbsp', aisleCategory: 'dairy' },
      { name: 'Worcestershire sauce', amount: '2', unit: 'tbsp', aisleCategory: 'pantry' },
      { name: 'Gruyere or Swiss cheese', amount: '1.5', unit: 'cups', aisleCategory: 'dairy' },
      { name: 'garlic', amount: '4', unit: 'cloves', aisleCategory: 'produce' },
      { name: 'fresh thyme', amount: '4', unit: 'sprigs', aisleCategory: 'produce' }
    ]
  },
  {
    title: 'Classic Smash Burgers with Secret Sauce',
    frequency: '1_week',
    servings: '4',
    cookTime: '15 mins',
    notes: 'Ultra-crispy lacy edges, shaved sweet onions smashed into beef, melted American cheese on toasted brioche.',
    instructions: JSON.stringify([
      'Divide 80/20 ground beef into 4 loose balls (do not overwork).',
      'Whisk secret sauce: mayonnaise, ketchup, relish, Dijon mustard, dash of vinegar, and smoked paprika.',
      'Heat cast-iron skillet until smoking hot. Place beef ball, top with paper-thin shaved onions, and smash paper-thin with heavy spatula.',
      'Season with salt and black pepper; cook 2 mins until edges are deeply caramelized and crispy.',
      'Flip, immediately top with American cheese slice, and cover for 1 min to melt.',
      'Assemble on butter-toasted brioche buns with secret sauce and dill pickles.'
    ]),
    ingredients: [
      { name: 'ground chuck beef (80/20)', amount: '1', unit: 'lb', aisleCategory: 'meat' },
      { name: 'American cheese slices', amount: '4', unit: 'slices', aisleCategory: 'dairy' },
      { name: 'brioche hamburger buns', amount: '4', unit: 'buns', aisleCategory: 'pantry' },
      { name: 'yellow onion (shaved paper-thin)', amount: '1/2', unit: 'medium', aisleCategory: 'produce' },
      { name: 'mayonnaise', amount: '1/3', unit: 'cup', aisleCategory: 'pantry' },
      { name: 'ketchup', amount: '2', unit: 'tbsp', aisleCategory: 'pantry' },
      { name: 'sweet pickle relish', amount: '1', unit: 'tbsp', aisleCategory: 'pantry' },
      { name: 'dill pickle slices', amount: '8', unit: 'slices', aisleCategory: 'pantry' }
    ]
  },
  {
    title: 'Crispy Buttermilk Fried Chicken Burgers',
    frequency: '2_month',
    servings: '4',
    cookTime: '30 mins',
    notes: 'Buttermilk-marinated crispy fried chicken thighs with crunchy spicy slaw and sriracha mayo on toasted brioche.',
    instructions: JSON.stringify([
      'Marinate chicken thighs in buttermilk, pickle juice, and hot sauce for at least 30 mins.',
      'Dredge chicken in flour seasoned with garlic powder, onion powder, smoked paprika, cayenne, salt, and pepper (drizzle 2 tbsp buttermilk into flour for extra crispy crags).',
      'Fry in 350°F (175°C) oil for 6-7 mins per side until golden brown and internal temp reaches 165°F.',
      'Toss shredded cabbage with mayo, vinegar, salt, and pepper for quick crunchy slaw.',
      'Toast brioche buns, spread spicy sriracha mayo, layer pickles, crispy chicken, and crunchy slaw.'
    ]),
    ingredients: [
      { name: 'boneless skinless chicken thighs', amount: '4', unit: 'thighs', aisleCategory: 'meat' },
      { name: 'buttermilk', amount: '1.5', unit: 'cups', aisleCategory: 'dairy' },
      { name: 'all-purpose flour', amount: '2', unit: 'cups', aisleCategory: 'pantry' },
      { name: 'brioche burger buns', amount: '4', unit: 'buns', aisleCategory: 'pantry' },
      { name: 'shredded coleslaw mix', amount: '2', unit: 'cups', aisleCategory: 'produce' },
      { name: 'pickle slices & pickle juice', amount: '1/2', unit: 'cup', aisleCategory: 'pantry' },
      { name: 'mayonnaise', amount: '1/3', unit: 'cup', aisleCategory: 'pantry' },
      { name: 'smoked paprika & garlic powder', amount: '2', unit: 'tbsp', aisleCategory: 'spices' },
      { name: 'hot sauce & cayenne', amount: '1', unit: 'tbsp', aisleCategory: 'pantry' }
    ]
  }
];

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: '6bowens@gmail.com' }
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  for (const r of RECIPES) {
    await prisma.customRecipe.deleteMany({
      where: { userId: user.id, title: r.title }
    });

    const created = await prisma.customRecipe.create({
      data: {
        title: r.title,
        sourceType: 'manual',
        frequency: r.frequency,
        servings: r.servings,
        cookTime: r.cookTime,
        notes: r.notes,
        instructions: r.instructions,
        userId: user.id,
        ingredients: {
          create: r.ingredients.map(ing => ({
            name: ing.name,
            normalizedName: ing.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(),
            amount: ing.amount,
            unit: ing.unit,
            aisleCategory: ing.aisleCategory,
            optional: false
          }))
        }
      }
    });

    console.log(`Added "${created.title}" (ID: ${created.id})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
