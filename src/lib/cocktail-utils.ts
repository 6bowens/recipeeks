export interface ClassicCocktailSpec {
  id: string;
  name: string;
  spiritBase: string; // 'Bourbon / Rye', 'Gin', 'Tequila / Mezcal', 'Rum', 'Vodka', 'Brandy', 'Amaro / Spritz'
  flavorProfiles: ('boozy' | 'sour' | 'bitter' | 'highball' | 'tiki' | 'herbal' | 'dessert')[];
  complexity: 'quick' | 'classic' | 'craft';
  glassware: string;
  ice: string;
  technique: string;
  ingredients: {
    name: string;
    amount: string;
    unit?: string;
    optional?: boolean;
  }[];
  instructions: string[];
  garnish?: string;
  description: string;
}

export const BAR_STAPLES = [
  'Angostura Bitters',
  'Orange Bitters',
  'Peychaud\'s Bitters',
  'Simple Syrup',
  'Rich Simple Syrup',
  'Demerara Syrup',
  'Honey Syrup',
  'Honey-Ginger Syrup',
  'Agave Nectar',
  'Agave Syrup',
  'Grenadine',
  'Orgeat (Almond Syrup)',
  'Fresh Lemon Juice',
  'Fresh Lemon',
  'Fresh Lime Juice',
  'Fresh Lime',
  'Fresh Orange',
  'Fresh Grapefruit Juice',
  'Fresh Mint',
  'Club Soda',
  'Tonic Water',
  'Ginger Beer',
  'Sweet Vermouth',
  'Dry Vermouth',
  'Campari',
  'Aperol',
  'Triple Sec',
  'Cointreau',
  'Maraschino Liqueur (Luxardo)',
  'Ice',
];

export function isRecognizedBarStaple(name: string): boolean {
  const norm = name.toLowerCase().trim();
  return BAR_STAPLES.some((s) => norm.includes(s.toLowerCase()) || s.toLowerCase().includes(norm));
}

export function deduceBarCategory(name: string): string {
  const norm = name.toLowerCase().trim();

  // 1. Bitters & Syrups
  if (
    norm.includes('bitter') ||
    norm.includes('syrup') ||
    norm.includes('agave') ||
    norm.includes('grenadine') ||
    norm.includes('orgeat') ||
    norm.includes('honey') ||
    norm.includes('passion fruit syrup') ||
    norm.includes('raspberry syrup')
  ) {
    return 'bitters_syrups';
  }

  // 2. Base Spirits
  if (
    norm.includes('bourbon') ||
    norm.includes('whiskey') ||
    norm.includes('whisky') ||
    norm.includes('rye') ||
    norm.includes('scotch') ||
    norm.includes('gin') ||
    norm.includes('tequila') ||
    norm.includes('mezcal') ||
    norm.includes('rum') ||
    norm.includes('rhum') ||
    norm.includes('vodka') ||
    norm.includes('cognac') ||
    norm.includes('brandy') ||
    norm.includes('absinthe') ||
    norm.includes('pisco')
  ) {
    return 'spirits';
  }

  // 3. Liqueurs & Amari
  if (
    norm.includes('vermouth') ||
    norm.includes('campari') ||
    norm.includes('aperol') ||
    norm.includes('cointreau') ||
    norm.includes('triple sec') ||
    norm.includes('curacao') ||
    norm.includes('curaçao') ||
    norm.includes('chartreuse') ||
    norm.includes('amaro') ||
    norm.includes('nonino') ||
    norm.includes('averna') ||
    norm.includes('montenegro') ||
    norm.includes('cynar') ||
    norm.includes('kahlua') ||
    norm.includes('kahlúa') ||
    norm.includes('coffee liqueur') ||
    norm.includes('maraschino') ||
    norm.includes('luxardo') ||
    norm.includes('benedictine') ||
    norm.includes('lillet') ||
    norm.includes('cocchi') ||
    norm.includes('amaretto') ||
    norm.includes('chambord') ||
    norm.includes('cassis') ||
    norm.includes('fernet') ||
    norm.includes('drambuie') ||
    norm.includes('heering') ||
    norm.includes('creme de') ||
    norm.includes('crème de')
  ) {
    return 'liqueurs';
  }

  // 4. Fresh Produce & Herbs
  if (
    norm.includes('lemon') ||
    norm.includes('lime') ||
    norm.includes('orange') ||
    norm.includes('grapefruit') ||
    norm.includes('mint') ||
    norm.includes('basil') ||
    norm.includes('cucumber') ||
    norm.includes('ginger') ||
    norm.includes('pineapple') ||
    norm.includes('berry') ||
    norm.includes('raspberry') ||
    norm.includes('blackberry') ||
    norm.includes('cherry') ||
    norm.includes('cherries')
  ) {
    return 'produce';
  }

  // 5. Mixers & Sodas
  if (
    norm.includes('club soda') ||
    norm.includes('soda') ||
    norm.includes('tonic') ||
    norm.includes('ginger beer') ||
    norm.includes('ginger ale') ||
    norm.includes('cola') ||
    norm.includes('coke') ||
    norm.includes('prosecco') ||
    norm.includes('champagne') ||
    norm.includes('sparkling wine') ||
    norm.includes('tomato juice')
  ) {
    return 'mixers';
  }

  // 6. Ice, Garnishes & Pantry
  if (
    norm.includes('olive') ||
    norm.includes('egg white') ||
    norm.includes('aquafaba') ||
    norm.includes('cream') ||
    norm.includes('milk') ||
    norm.includes('nutmeg') ||
    norm.includes('salt') ||
    norm.includes('sugar') ||
    norm.includes('ice') ||
    norm.includes('coconut cream') ||
    norm.includes('coco lopez')
  ) {
    return 'ice_garnishes';
  }

  return 'spirits';
}

export const CLASSIC_COCKTAILS: ClassicCocktailSpec[] = [
  // ==========================================
  // TEQUILA / MEZCAL
  // ==========================================
  {
    id: 'margarita',
    name: 'Classic Margarita',
    spiritBase: 'Tequila / Mezcal',
    flavorProfiles: ['sour'],
    complexity: 'classic',
    glassware: 'Rocks Glass or Coupe',
    ice: 'Fresh Ice Cubes or Up',
    technique: 'Shaken',
    ingredients: [
      { name: 'Blanco Tequila', amount: '2', unit: 'oz' },
      { name: 'Cointreau or Triple Sec', amount: '1', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '1', unit: 'oz' },
      { name: 'Agave Nectar', amount: '0.25', unit: 'oz', optional: true },
      { name: 'Kosher Salt for Rim', amount: '1', unit: 'pinch', optional: true },
    ],
    instructions: [
      'Rub a lime wedge along the outer rim of a rocks glass and roll in kosher salt.',
      'Combine tequila, Cointreau, fresh lime juice, and agave in a shaker filled with ice.',
      'Shake vigorously for 15 seconds until frosty.',
      'Strain into the salt-rimmed rocks glass over fresh ice.',
    ],
    garnish: 'Salt Rim & Lime Wheel',
    description: 'Crisp, tart, and undeniably iconic agave and citrus masterpiece.',
  },
  {
    id: 'tommys-margarita',
    name: "Tommy's Margarita",
    spiritBase: 'Tequila / Mezcal',
    flavorProfiles: ['sour'],
    complexity: 'quick',
    glassware: 'Rocks Glass',
    ice: 'Fresh Ice Cubes',
    technique: 'Shaken',
    ingredients: [
      { name: 'Reposado or Blanco Tequila', amount: '2', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '1', unit: 'oz' },
      { name: 'Agave Nectar', amount: '0.5', unit: 'oz' },
    ],
    instructions: [
      'Combine tequila, fresh lime juice, and agave nectar in a shaker with plenty of ice.',
      'Shake vigorously for 15 seconds.',
      'Strain over fresh ice in a rocks glass.',
    ],
    garnish: 'Lime Wedge',
    description: 'San Francisco legend created by Julio Bermejo—pure agave flavor without orange liqueur.',
  },
  {
    id: 'oaxacan-old-fashioned',
    name: 'Oaxacan Old Fashioned',
    spiritBase: 'Tequila / Mezcal',
    flavorProfiles: ['boozy'],
    complexity: 'classic',
    glassware: 'Rocks Glass',
    ice: 'Large Clear Ice Cube',
    technique: 'Stirred',
    ingredients: [
      { name: 'Reposado Tequila', amount: '1.5', unit: 'oz' },
      { name: 'Mezcal (Espadín)', amount: '0.5', unit: 'oz' },
      { name: 'Agave Nectar', amount: '1', unit: 'barspoon' },
      { name: 'Angostura Bitters', amount: '2', unit: 'dashes' },
    ],
    instructions: [
      'Combine reposado tequila, smoky mezcal, agave nectar, and bitters in a mixing glass with ice.',
      'Stir for 30 seconds until chilled and silky.',
      'Strain over a large ice block in a rocks glass. Express a flamed orange peel over the top.',
    ],
    garnish: 'Flamed Orange Peel',
    description: 'Created at Death & Co in NYC—smoky mezcal and aged agave reimagining the Old Fashioned.',
  },
  {
    id: 'paloma',
    name: 'Cantina Paloma',
    spiritBase: 'Tequila / Mezcal',
    flavorProfiles: ['highball', 'sour'],
    complexity: 'quick',
    glassware: 'Highball / Collins Glass',
    ice: 'Fresh Ice Cubes',
    technique: 'Built / Stirred',
    ingredients: [
      { name: 'Blanco Tequila or Mezcal', amount: '2', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.5', unit: 'oz' },
      { name: 'Grapefruit Soda (Jarritos, Squirt, or Fever-Tree)', amount: '4', unit: 'oz' },
      { name: 'Pinch of Sea Salt', amount: '1', unit: 'pinch' },
    ],
    instructions: [
      'Rim a tall highball glass with salt (optional) and fill with fresh ice.',
      'Add tequila, lime juice, and a pinch of salt.',
      'Top with grapefruit soda and stir gently once to combine.',
    ],
    garnish: 'Grapefruit Wedge & Salt Rim',
    description: 'Mexico\'s most beloved cocktail—tart, sparkling, salty, and ultra-refreshing.',
  },
  {
    id: 'mezcal-negroni',
    name: 'Mezcal Negroni',
    spiritBase: 'Tequila / Mezcal',
    flavorProfiles: ['bitter', 'boozy'],
    complexity: 'quick',
    glassware: 'Rocks Glass',
    ice: 'Large Clear Ice Cube',
    technique: 'Stirred',
    ingredients: [
      { name: 'Mezcal (Espadín)', amount: '1', unit: 'oz' },
      { name: 'Campari', amount: '1', unit: 'oz' },
      { name: 'Sweet Vermouth', amount: '1', unit: 'oz' },
    ],
    instructions: [
      'Combine mezcal, Campari, and sweet vermouth in a mixing glass filled with ice.',
      'Stir gently for 30 seconds until chilled and balanced.',
      'Strain into a rocks glass over a single large ice cube.',
    ],
    garnish: 'Expressed Orange Peel',
    description: 'A smoky agave twist on the Florentine classic with bittersweet intensity.',
  },
  {
    id: 'siesta',
    name: 'The Siesta',
    spiritBase: 'Tequila / Mezcal',
    flavorProfiles: ['bitter', 'sour'],
    complexity: 'craft',
    glassware: 'Coupe Glass',
    ice: 'Served Up',
    technique: 'Shaken',
    ingredients: [
      { name: 'Blanco Tequila', amount: '1.5', unit: 'oz' },
      { name: 'Campari', amount: '0.5', unit: 'oz' },
      { name: 'Fresh Grapefruit Juice', amount: '0.5', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.5', unit: 'oz' },
      { name: 'Simple Syrup or Agave', amount: '0.5', unit: 'oz' },
    ],
    instructions: [
      'Add all ingredients to a shaker filled with ice.',
      'Shake vigorously for 15 seconds.',
      'Double strain into a chilled coupe glass.',
    ],
    garnish: 'Grapefruit Twist',
    description: 'Created by Katie Stipe at NYC\'s Flatiron Lounge—grapefruit and Campari elevating crisp tequila.',
  },
  {
    id: 'naked-and-famous',
    name: 'Naked and Famous',
    spiritBase: 'Tequila / Mezcal',
    flavorProfiles: ['herbal', 'bitter', 'sour'],
    complexity: 'craft',
    glassware: 'Coupe Glass',
    ice: 'Served Up',
    technique: 'Shaken',
    ingredients: [
      { name: 'Mezcal', amount: '0.75', unit: 'oz' },
      { name: 'Aperol', amount: '0.75', unit: 'oz' },
      { name: 'Yellow Chartreuse (or Strega)', amount: '0.75', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.75', unit: 'oz' },
    ],
    instructions: [
      'Add equal parts mezcal, Aperol, Chartreuse, and lime juice into a shaker with ice.',
      'Shake vigorously for 15 seconds.',
      'Fine strain into a chilled coupe.',
    ],
    garnish: 'Lime Wheel',
    description: 'Joaquín Simó modern classic—equal parts smoky, bittersweet, herbal, and citrus harmony.',
  },
  {
    id: 'mexican-firing-squad',
    name: 'Mexican Firing Squad',
    spiritBase: 'Tequila / Mezcal',
    flavorProfiles: ['sour', 'herbal'],
    complexity: 'classic',
    glassware: 'Rocks Glass',
    ice: 'Crushed or Cubed Ice',
    technique: 'Shaken',
    ingredients: [
      { name: 'Blanco or Reposado Tequila', amount: '2', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.75', unit: 'oz' },
      { name: 'Grenadine (Pomegranate Syrup)', amount: '0.75', unit: 'oz' },
      { name: 'Angostura Bitters', amount: '4-5', unit: 'dashes' },
    ],
    instructions: [
      'Combine tequila, lime juice, grenadine, and aromatic bitters in a shaker with ice.',
      'Shake hard for 15 seconds.',
      'Strain into a rocks glass over fresh ice.',
    ],
    garnish: 'Lime Wheel & Brandied Cherry',
    description: '1937 Mexico City classic—ruby pomegranate and bold aromatic bitters elevate agave tequila.',
  },
  {
    id: 'el-diablo',
    name: 'El Diablo',
    spiritBase: 'Tequila / Mezcal',
    flavorProfiles: ['highball', 'sour'],
    complexity: 'classic',
    glassware: 'Highball Glass',
    ice: 'Cubed Ice',
    technique: 'Shaken & Topped',
    ingredients: [
      { name: 'Reposado Tequila', amount: '1.5', unit: 'oz' },
      { name: 'Crème de Cassis (Blackcurrant Liqueur)', amount: '0.5', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.5', unit: 'oz' },
      { name: 'Ginger Beer', amount: '3-4', unit: 'oz' },
    ],
    instructions: [
      'Shake tequila, crème de cassis, and lime juice with ice.',
      'Strain into a tall highball glass filled with ice.',
      'Top with spicy ginger beer and gently stir once.',
    ],
    garnish: 'Lime Wedge & Candied Ginger',
    description: 'Trader Vic\'s 1940s agave highball—spicy ginger beer and dark blackcurrant liqueur.',
  },
  {
    id: 'rosita',
    name: 'The Rosita',
    spiritBase: 'Tequila / Mezcal',
    flavorProfiles: ['bitter', 'boozy'],
    complexity: 'craft',
    glassware: 'Rocks Glass or Coupe',
    ice: 'Large Ice Cube or Up',
    technique: 'Stirred',
    ingredients: [
      { name: 'Reposado Tequila', amount: '1.5', unit: 'oz' },
      { name: 'Campari', amount: '0.5', unit: 'oz' },
      { name: 'Sweet Vermouth', amount: '0.5', unit: 'oz' },
      { name: 'Dry Vermouth', amount: '0.5', unit: 'oz' },
      { name: 'Angostura Bitters', amount: '1', unit: 'dash' },
    ],
    instructions: [
      'Stir all ingredients in a mixing glass with plenty of ice for 30 seconds.',
      'Strain over a large ice block in a rocks glass.',
    ],
    garnish: 'Expressed Lemon or Orange Peel',
    description: 'The elegant split-vermouth agave Negroni rediscovered by Gary Regan.',
  },

  // ==========================================
  // BOURBON / RYE / WHISKEY
  // ==========================================
  {
    id: 'old-fashioned',
    name: 'Old Fashioned',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['boozy'],
    complexity: 'quick',
    glassware: 'Rocks / Old Fashioned Glass',
    ice: 'Large Clear Ice Cube',
    technique: 'Stirred',
    ingredients: [
      { name: 'Bourbon or Rye Whiskey', amount: '2', unit: 'oz' },
      { name: 'Demerara Syrup or Simple Syrup', amount: '0.25', unit: 'oz' },
      { name: 'Angostura Bitters', amount: '2-3', unit: 'dashes' },
      { name: 'Orange Bitters', amount: '1', unit: 'dash', optional: true },
    ],
    instructions: [
      'Add syrup and bitters into a mixing glass with whiskey and a large block of ice.',
      'Stir gently for 30 seconds until properly chilled and diluted.',
      'Strain over a large ice cube in a rocks glass.',
      'Express the oils of an orange peel over the glass and drop it in.',
    ],
    garnish: 'Expressed Orange Peel & Luxardo Cherry',
    description: 'The archetype of the cocktail—rich, spirit-forward, and timeless.',
  },
  {
    id: 'manhattan',
    name: 'Manhattan',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['boozy'],
    complexity: 'quick',
    glassware: 'Coupe or Nick & Nora Glass',
    ice: 'Served Up (Chilled)',
    technique: 'Stirred',
    ingredients: [
      { name: 'Rye Whiskey', amount: '2', unit: 'oz' },
      { name: 'Sweet Vermouth', amount: '1', unit: 'oz' },
      { name: 'Angostura Bitters', amount: '2', unit: 'dashes' },
    ],
    instructions: [
      'Combine rye whiskey, sweet vermouth, and Angostura bitters in a mixing glass with ice.',
      'Stir smoothly for 30 seconds until silky and cold.',
      'Strain into a chilled coupe or Nick & Nora glass.',
    ],
    garnish: 'Brandied Luxardo Cherry',
    description: 'The quintessential stirred whiskey classic—spicy rye rounded with rich herbal vermouth.',
  },
  {
    id: 'whiskey-sour',
    name: 'Boston Whiskey Sour',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['sour'],
    complexity: 'classic',
    glassware: 'Coupe or Rocks Glass',
    ice: 'Served Up or on Rocks',
    technique: 'Dry Shake & Hard Shake',
    ingredients: [
      { name: 'Bourbon or Rye Whiskey', amount: '2', unit: 'oz' },
      { name: 'Fresh Lemon Juice', amount: '0.75', unit: 'oz' },
      { name: 'Simple Syrup', amount: '0.75', unit: 'oz' },
      { name: 'Egg White (or Aquafaba)', amount: '0.5', unit: 'oz', optional: true },
      { name: 'Angostura Bitters', amount: '2-3', unit: 'drops for foam' },
    ],
    instructions: [
      'Add whiskey, lemon juice, simple syrup, and egg white to a shaker without ice.',
      'Dry shake vigorously for 15 seconds to emulsify egg white into foam.',
      'Add ice and shake hard for another 15 seconds until frosty.',
      'Fine strain into a chilled coupe. Dot surface with Angostura bitters.',
    ],
    garnish: 'Angostura Bitters Drops & Lemon Wheel',
    description: 'Velvety, creamy citrus foam balancing rich bourbon warmth.',
  },
  {
    id: 'paper-plane',
    name: 'Paper Plane',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['bitter', 'sour'],
    complexity: 'classic',
    glassware: 'Coupe Glass',
    ice: 'Served Up (Chilled)',
    technique: 'Shaken',
    ingredients: [
      { name: 'Bourbon Whiskey', amount: '0.75', unit: 'oz' },
      { name: 'Aperol', amount: '0.75', unit: 'oz' },
      { name: 'Amaro Nonino Quintessentia', amount: '0.75', unit: 'oz' },
      { name: 'Fresh Lemon Juice', amount: '0.75', unit: 'oz' },
    ],
    instructions: [
      'Add bourbon, Aperol, Amaro Nonino, and fresh lemon juice to a shaker with ice.',
      'Shake hard for 15 seconds.',
      'Fine strain into a chilled coupe.',
    ],
    garnish: 'Mini paper airplane or Lemon Twist',
    description: 'Modern classic created by Sam Ross—bright bittersweet citrus with bourbon warmth.',
  },
  {
    id: 'boulevardier',
    name: 'Boulevardier',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['bitter', 'boozy'],
    complexity: 'quick',
    glassware: 'Rocks Glass or Coupe',
    ice: 'Large Ice Cube or Up',
    technique: 'Stirred',
    ingredients: [
      { name: 'Bourbon or Rye Whiskey', amount: '1.5', unit: 'oz' },
      { name: 'Campari', amount: '1', unit: 'oz' },
      { name: 'Sweet Vermouth', amount: '1', unit: 'oz' },
    ],
    instructions: [
      'Add bourbon, Campari, and sweet vermouth into a mixing glass with plenty of ice.',
      'Stir for 30 seconds until well-chilled and integrated.',
      'Strain into a rocks glass over a large ice cube or into a chilled coupe.',
    ],
    garnish: 'Orange Twist or Brandied Cherry',
    description: 'The Parisian sibling of the Negroni—swapping gin for rich, warming American whiskey.',
  },
  {
    id: 'sazerac',
    name: 'New Orleans Sazerac',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['boozy', 'herbal'],
    complexity: 'classic',
    glassware: 'Rocks Glass',
    ice: 'Served Neat (No Ice)',
    technique: 'Stirred & Absinthe Rinse',
    ingredients: [
      { name: 'Rye Whiskey (or Cognac)', amount: '2', unit: 'oz' },
      { name: 'Demerara Syrup or Sugar Cube', amount: '0.25', unit: 'oz' },
      { name: 'Peychaud\'s Bitters', amount: '3-4', unit: 'dashes' },
      { name: 'Angostura Bitters', amount: '1', unit: 'dash' },
      { name: 'Absinthe or Herbsaint', amount: '1', unit: 'rinse' },
    ],
    instructions: [
      'Rinse a chilled rocks glass with absinthe and discard excess.',
      'In a mixing glass with ice, stir rye, syrup, and both bitters for 30 seconds.',
      'Strain into the prepared absinthe-rinsed glass.',
      'Express lemon peel oils over the glass and discard the peel.',
    ],
    garnish: 'Expressed Lemon Peel',
    description: 'America\'s oldest cocktail—an aromatic New Orleans icon of rye, anise, and creole bitters.',
  },
  {
    id: 'penicillin',
    name: 'Penicillin',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['sour'],
    complexity: 'craft',
    glassware: 'Rocks Glass',
    ice: 'Large Clear Ice Cube',
    technique: 'Shaken with Islay Float',
    ingredients: [
      { name: 'Blended Scotch or Bourbon Whiskey', amount: '2', unit: 'oz' },
      { name: 'Fresh Lemon Juice', amount: '0.75', unit: 'oz' },
      { name: 'Honey-Ginger Syrup', amount: '0.75', unit: 'oz' },
      { name: 'Smoky Islay Scotch or Mezcal', amount: '0.25', unit: 'oz float', optional: true },
    ],
    instructions: [
      'Combine whiskey, lemon juice, and honey-ginger syrup in a shaker with ice.',
      'Shake vigorously and strain into a rocks glass over a large ice cube.',
      'Gently float smoky scotch over the back of a bar spoon on top.',
    ],
    garnish: 'Candied Ginger or Lemon Wheel',
    description: 'Modern craft legend created by Sam Ross—spicy ginger, tart lemon, and rich peat smoke.',
  },
  {
    id: 'gold-rush',
    name: 'Gold Rush',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['sour'],
    complexity: 'quick',
    glassware: 'Rocks Glass',
    ice: 'Large Clear Ice Cube',
    technique: 'Shaken',
    ingredients: [
      { name: 'Bourbon Whiskey', amount: '2', unit: 'oz' },
      { name: 'Fresh Lemon Juice', amount: '0.75', unit: 'oz' },
      { name: 'Honey Syrup (3:1 honey to warm water)', amount: '0.75', unit: 'oz' },
    ],
    instructions: [
      'Combine bourbon, fresh lemon juice, and honey syrup in a shaker with ice.',
      'Shake hard for 15 seconds.',
      'Strain over a large ice cube in a rocks glass.',
    ],
    garnish: 'Lemon Wheel',
    description: 'Milk & Honey modern classic—a silky bourbon sour kissed with rich wildflower honey.',
  },
  {
    id: 'vieux-carre',
    name: 'Vieux Carré',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['boozy', 'herbal'],
    complexity: 'craft',
    glassware: 'Rocks Glass',
    ice: 'Large Ice Cube',
    technique: 'Stirred',
    ingredients: [
      { name: 'Rye Whiskey', amount: '0.75', unit: 'oz' },
      { name: 'Cognac or Brandy', amount: '0.75', unit: 'oz' },
      { name: 'Sweet Vermouth', amount: '0.75', unit: 'oz' },
      { name: 'Bénédictine Liqueur', amount: '1', unit: 'barspoon' },
      { name: 'Peychaud\'s Bitters', amount: '1', unit: 'dash' },
      { name: 'Angostura Bitters', amount: '1', unit: 'dash' },
    ],
    instructions: [
      'Combine all ingredients in a mixing glass with plenty of ice.',
      'Stir for 30 seconds until well-chilled.',
      'Strain into a rocks glass over a single large ice cube.',
    ],
    garnish: 'Lemon Twist or Brandied Cherry',
    description: '1930s Hotel Monteleone masterpiece from the French Quarter of New Orleans.',
  },
  {
    id: 'black-manhattan',
    name: 'Black Manhattan',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['boozy', 'bitter'],
    complexity: 'classic',
    glassware: 'Coupe or Nick & Nora',
    ice: 'Served Up',
    technique: 'Stirred',
    ingredients: [
      { name: 'Rye Whiskey', amount: '2', unit: 'oz' },
      { name: 'Amaro Averna', amount: '1', unit: 'oz' },
      { name: 'Angostura Bitters', amount: '1', unit: 'dash' },
      { name: 'Orange Bitters', amount: '1', unit: 'dash' },
    ],
    instructions: [
      'Stir rye whiskey, Amaro Averna, and bitters with ice for 30 seconds.',
      'Strain into a chilled coupe glass.',
    ],
    garnish: 'Luxardo Cherry',
    description: 'Modern classic created by Todd Smith at Bourbon & Branch in SF—replacing vermouth with Sicilian amaro.',
  },
  {
    id: 'brown-derby',
    name: 'Brown Derby',
    spiritBase: 'Bourbon / Rye',
    flavorProfiles: ['sour'],
    complexity: 'classic',
    glassware: 'Coupe Glass',
    ice: 'Served Up',
    technique: 'Shaken',
    ingredients: [
      { name: 'Bourbon Whiskey', amount: '1.5', unit: 'oz' },
      { name: 'Fresh Grapefruit Juice', amount: '1', unit: 'oz' },
      { name: 'Honey Syrup', amount: '0.5', unit: 'oz' },
    ],
    instructions: [
      'Add bourbon, fresh pink grapefruit juice, and honey syrup to a shaker with ice.',
      'Shake hard for 15 seconds.',
      'Double strain into a chilled coupe.',
    ],
    garnish: 'Grapefruit Twist',
    description: '1930s Hollywood Golden Age classic named after the famous hat-shaped diner on Wilshire Blvd.',
  },

  // ==========================================
  // GIN
  // ==========================================
  {
    id: 'negroni',
    name: 'Negroni',
    spiritBase: 'Gin',
    flavorProfiles: ['bitter', 'boozy'],
    complexity: 'quick',
    glassware: 'Rocks Glass',
    ice: 'Large Clear Ice Cube',
    technique: 'Stirred',
    ingredients: [
      { name: 'London Dry Gin', amount: '1', unit: 'oz' },
      { name: 'Campari', amount: '1', unit: 'oz' },
      { name: 'Sweet Vermouth', amount: '1', unit: 'oz' },
    ],
    instructions: [
      'Combine gin, Campari, and sweet vermouth in a mixing glass with ice.',
      'Stir for 30 seconds until chilled and silky.',
      'Strain into a rocks glass over a fresh large ice cube.',
    ],
    garnish: 'Expressed Orange Peel',
    description: 'The golden ratio of equal parts—bitter, botanical, and bittersweet.',
  },
  {
    id: 'gimlet',
    name: 'Classic Gimlet',
    spiritBase: 'Gin',
    flavorProfiles: ['sour'],
    complexity: 'quick',
    glassware: 'Coupe Glass',
    ice: 'Served Up (Chilled)',
    technique: 'Shaken',
    ingredients: [
      { name: 'London Dry Gin', amount: '2', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.75', unit: 'oz' },
      { name: 'Simple Syrup', amount: '0.75', unit: 'oz' },
    ],
    instructions: [
      'Add gin, fresh lime juice, and simple syrup into a shaker with ice.',
      'Shake vigorously for 15 seconds.',
      'Fine strain into a chilled coupe.',
    ],
    garnish: 'Lime Wheel',
    description: 'Sharp, brisk, and botanical perfection.',
  },
  {
    id: 'last-word',
    name: 'The Last Word',
    spiritBase: 'Gin',
    flavorProfiles: ['herbal', 'sour'],
    complexity: 'classic',
    glassware: 'Coupe Glass',
    ice: 'Served Up (Chilled)',
    technique: 'Shaken',
    ingredients: [
      { name: 'Gin', amount: '0.75', unit: 'oz' },
      { name: 'Green Chartreuse', amount: '0.75', unit: 'oz' },
      { name: 'Maraschino Liqueur (Luxardo)', amount: '0.75', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.75', unit: 'oz' },
    ],
    instructions: [
      'Add all four ingredients in equal parts into a shaker with ice.',
      'Shake vigorously for 15 seconds.',
      'Fine strain into a chilled coupe glass.',
    ],
    garnish: 'Luxardo Cherry or Lime Twist',
    description: 'Prohibition-era masterpiece—herbaceous, tart, and deeply complex.',
  },
  {
    id: 'french-75',
    name: 'French 75',
    spiritBase: 'Gin',
    flavorProfiles: ['highball', 'sour'],
    complexity: 'classic',
    glassware: 'Champagne Flute or Coupe',
    ice: 'Served Up (Chilled)',
    technique: 'Shaken & Topped',
    ingredients: [
      { name: 'Gin or Cognac', amount: '1', unit: 'oz' },
      { name: 'Fresh Lemon Juice', amount: '0.5', unit: 'oz' },
      { name: 'Simple Syrup', amount: '0.5', unit: 'oz' },
      { name: 'Champagne or Prosecco', amount: '3', unit: 'oz' },
    ],
    instructions: [
      'Shake gin, lemon juice, and simple syrup in a shaker with ice.',
      'Strain into a chilled flute.',
      'Top with bubbly champagne and express a lemon twist.',
    ],
    garnish: 'Long Lemon Twist',
    description: 'Named after the French 75mm artillery gun—crisp citrus with celebratory fizz.',
  },
  {
    id: 'corpse-reviver-2',
    name: 'Corpse Reviver #2',
    spiritBase: 'Gin',
    flavorProfiles: ['sour', 'herbal'],
    complexity: 'classic',
    glassware: 'Coupe Glass',
    ice: 'Served Up',
    technique: 'Shaken',
    ingredients: [
      { name: 'Gin', amount: '0.75', unit: 'oz' },
      { name: 'Lillet Blanc or Cocchi Americano', amount: '0.75', unit: 'oz' },
      { name: 'Cointreau or Triple Sec', amount: '0.75', unit: 'oz' },
      { name: 'Fresh Lemon Juice', amount: '0.75', unit: 'oz' },
      { name: 'Absinthe', amount: '1', unit: 'rinse' },
    ],
    instructions: [
      'Rinse a chilled coupe glass with a splash of absinthe and dump the excess.',
      'Add gin, Lillet Blanc, Cointreau, and lemon juice into a shaker with ice.',
      'Shake hard for 15 seconds and strain into the absinthe-rinsed coupe.',
    ],
    garnish: 'Lemon Twist or Brandied Cherry',
    description: 'Legendary cure-all—bright citrus with an enchanting anise perfume.',
  },
  {
    id: 'tom-collins',
    name: 'Tom Collins',
    spiritBase: 'Gin',
    flavorProfiles: ['highball', 'sour'],
    complexity: 'quick',
    glassware: 'Collins / Highball Glass',
    ice: 'Fresh Cubed Ice',
    technique: 'Built / Shaken & Topped',
    ingredients: [
      { name: 'Old Tom or London Dry Gin', amount: '2', unit: 'oz' },
      { name: 'Fresh Lemon Juice', amount: '1', unit: 'oz' },
      { name: 'Simple Syrup', amount: '0.5', unit: 'oz' },
      { name: 'Club Soda', amount: '3-4', unit: 'oz' },
    ],
    instructions: [
      'Shake gin, lemon juice, and simple syrup with ice.',
      'Strain into a tall Collins glass filled with fresh ice cubes.',
      'Top with club soda and stir gently once.',
    ],
    garnish: 'Lemon Wheel & Maraschino Cherry',
    description: 'The definitive sparkling lemonade for adults—effervescent, crisp, and thirst-quenching.',
  },
  {
    id: 'clover-club',
    name: 'Clover Club',
    spiritBase: 'Gin',
    flavorProfiles: ['sour'],
    complexity: 'classic',
    glassware: 'Coupe Glass',
    ice: 'Served Up',
    technique: 'Dry Shake & Shaken',
    ingredients: [
      { name: 'Gin', amount: '2', unit: 'oz' },
      { name: 'Fresh Lemon Juice', amount: '0.5', unit: 'oz' },
      { name: 'Raspberry Syrup (or Grenadine)', amount: '0.5', unit: 'oz' },
      { name: 'Dry Vermouth', amount: '0.5', unit: 'oz', optional: true },
      { name: 'Egg White', amount: '0.5', unit: 'oz' },
    ],
    instructions: [
      'Add all ingredients into a shaker without ice and dry shake for 15 seconds.',
      'Add ice and shake hard for 15 seconds until chilled.',
      'Fine strain into a chilled coupe.',
    ],
    garnish: 'Fresh Raspberries or Mint Leaf',
    description: 'Pre-prohibition gentleman\'s club cocktail—silky pink foam with berry tartness.',
  },
  {
    id: 'bees-knees',
    name: "Bee's Knees",
    spiritBase: 'Gin',
    flavorProfiles: ['sour'],
    complexity: 'quick',
    glassware: 'Coupe Glass',
    ice: 'Served Up',
    technique: 'Shaken',
    ingredients: [
      { name: 'London Dry Gin', amount: '2', unit: 'oz' },
      { name: 'Fresh Lemon Juice', amount: '0.75', unit: 'oz' },
      { name: 'Honey Syrup (3:1)', amount: '0.75', unit: 'oz' },
    ],
    instructions: [
      'Combine gin, fresh lemon juice, and honey syrup in a shaker with ice.',
      'Shake vigorously for 15 seconds.',
      'Strain into a chilled coupe.',
    ],
    garnish: 'Lemon Twist',
    description: 'Prohibition-era delight—sweet floral honey balancing botanical gin and tart lemon.',
  },
  {
    id: 'southside',
    name: 'The Southside',
    spiritBase: 'Gin',
    flavorProfiles: ['sour', 'herbal'],
    complexity: 'quick',
    glassware: 'Coupe Glass',
    ice: 'Served Up',
    technique: 'Shaken with Mint',
    ingredients: [
      { name: 'Gin', amount: '2', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.75', unit: 'oz' },
      { name: 'Simple Syrup', amount: '0.75', unit: 'oz' },
      { name: 'Fresh Mint Leaves', amount: '6-8', unit: 'leaves' },
    ],
    instructions: [
      'Gently slap mint leaves and add to shaker with gin, lime juice, and syrup.',
      'Add ice and shake hard for 15 seconds.',
      'Fine double strain into a chilled coupe.',
    ],
    garnish: 'Single Slapped Mint Leaf Float',
    description: 'The gin counterpart to the Mojito and Daiquiri—exceptionally crisp, minty, and clean.',
  },

  // ==========================================
  // RUM
  // ==========================================
  {
    id: 'daiquiri',
    name: 'Classic Daiquiri',
    spiritBase: 'Rum',
    flavorProfiles: ['sour'],
    complexity: 'quick',
    glassware: 'Coupe Glass',
    ice: 'Served Up (Chilled)',
    technique: 'Shaken',
    ingredients: [
      { name: 'White Rum', amount: '2', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.75', unit: 'oz' },
      { name: 'Simple Syrup', amount: '0.75', unit: 'oz' },
    ],
    instructions: [
      'Combine rum, fresh lime juice, and simple syrup in a shaker with plenty of ice.',
      'Shake vigorously for 15 seconds.',
      'Double strain into a chilled coupe.',
    ],
    garnish: 'Lime Wheel or Float',
    description: 'The purest test of a bartender—crisp rum elevated by tart citrus and sweetness.',
  },
  {
    id: 'mai-tai',
    name: '1944 Mai Tai',
    spiritBase: 'Rum',
    flavorProfiles: ['tiki', 'sour'],
    complexity: 'classic',
    glassware: 'Double Old Fashioned / Tiki Mug',
    ice: 'Crushed Ice',
    technique: 'Shaken',
    ingredients: [
      { name: 'Aged Jamaican Rum', amount: '1', unit: 'oz' },
      { name: 'Martinique Rhum Agricole or Dark Rum', amount: '1', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.75', unit: 'oz' },
      { name: 'Orange Curaçao or Triple Sec', amount: '0.5', unit: 'oz' },
      { name: 'Orgeat (Almond Syrup)', amount: '0.5', unit: 'oz' },
    ],
    instructions: [
      'Add rums, lime juice, curaçao, and orgeat into a shaker with crushed ice.',
      'Shake vigorously for 10 seconds.',
      'Pour entire contents unstrained into a double rocks glass or tiki mug.',
      'Top with more crushed ice and slap a fresh mint sprig before garnishing.',
    ],
    garnish: 'Spent Lime Shell & Fresh Mint Sprig (The Island & Palm Tree)',
    description: 'Victor "Trader Vic" Bergeron\'s 1944 original—"Mai Tai - Roa Ae!" (Out of this world!).',
  },
  {
    id: 'jungle-bird',
    name: 'Jungle Bird',
    spiritBase: 'Rum',
    flavorProfiles: ['bitter', 'tiki', 'sour'],
    complexity: 'classic',
    glassware: 'Rocks Glass or Tiki Mug',
    ice: 'Crushed Ice',
    technique: 'Shaken Hard',
    ingredients: [
      { name: 'Dark or Blackstrap Rum', amount: '1.5', unit: 'oz' },
      { name: 'Campari', amount: '0.75', unit: 'oz' },
      { name: 'Fresh Pineapple Juice', amount: '1.5', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.5', unit: 'oz' },
      { name: 'Demerara Syrup', amount: '0.5', unit: 'oz' },
    ],
    instructions: [
      'Add dark rum, Campari, pineapple juice, lime juice, and syrup into a shaker with ice.',
      'Shake vigorously for 15 seconds to create a frothy pineapple crema.',
      'Strain into a rocks glass filled with crushed ice.',
    ],
    garnish: 'Pineapple Fronds & Maraschino Cherry',
    description: '1970s Malaysian tiki masterpiece—where dark molasses rum meets bitter Italian Campari.',
  },
  {
    id: 'mojito',
    name: 'Classic Mojito',
    spiritBase: 'Rum',
    flavorProfiles: ['highball', 'herbal', 'sour'],
    complexity: 'classic',
    glassware: 'Collins Glass',
    ice: 'Crushed Ice',
    technique: 'Muddled & Built',
    ingredients: [
      { name: 'White Rum', amount: '2', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.75', unit: 'oz' },
      { name: 'Simple Syrup', amount: '0.75', unit: 'oz' },
      { name: 'Fresh Mint Leaves', amount: '8-10', unit: 'leaves' },
      { name: 'Club Soda', amount: '2-3', unit: 'oz' },
    ],
    instructions: [
      'Gently muddle mint leaves with lime juice and simple syrup in the base of a highball glass.',
      'Add white rum and fill the glass with crushed ice.',
      'Top with sparkling club soda and swizzle with a bar spoon.',
    ],
    garnish: 'Generous Fresh Mint Bouquet & Lime Wheel',
    description: 'Havana\'s legendary refresher—crisp mint, zesty lime, and sparkling effervescence.',
  },
  {
    id: 'dark-n-stormy',
    name: "Dark 'n Stormy",
    spiritBase: 'Rum',
    flavorProfiles: ['highball', 'sour'],
    complexity: 'quick',
    glassware: 'Highball Glass',
    ice: 'Cubed Ice',
    technique: 'Built with Float',
    ingredients: [
      { name: 'Black Seal Dark Rum', amount: '2', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.5', unit: 'oz' },
      { name: 'Spicy Ginger Beer', amount: '4', unit: 'oz' },
    ],
    instructions: [
      'Fill a tall highball glass with ice and add lime juice and ginger beer.',
      'Gently float dark rum over the top of the glass.',
    ],
    garnish: 'Lime Wedge',
    description: 'Bermuda\'s national cocktail—fiery ginger beer under a stormy cloud of dark molasses rum.',
  },

  // ==========================================
  // VODKA
  // ==========================================
  {
    id: 'espresso-martini',
    name: 'Espresso Martini',
    spiritBase: 'Vodka',
    flavorProfiles: ['dessert', 'boozy'],
    complexity: 'classic',
    glassware: 'Coupe or Martini Glass',
    ice: 'Served Up (Frothy)',
    technique: 'Shaken Hard',
    ingredients: [
      { name: 'Vodka', amount: '1.5', unit: 'oz' },
      { name: 'Coffee Liqueur (Kahlúa or Mr Black)', amount: '1', unit: 'oz' },
      { name: 'Freshly Brewed Espresso', amount: '1', unit: 'oz' },
      { name: 'Simple Syrup', amount: '0.25', unit: 'oz', optional: true },
    ],
    instructions: [
      'Combine vodka, coffee liqueur, fresh hot espresso, and syrup in a shaker filled with ice.',
      'Shake exceptionally hard for 20 seconds to build thick microfoam crema.',
      'Fine strain into a chilled coupe glass.',
    ],
    garnish: '3 Roasted Coffee Beans (Health, Wealth & Happiness)',
    description: 'Velvety, energizing, and rich with a signature crema foam head.',
  },
  {
    id: 'moscow-mule',
    name: 'Moscow Mule',
    spiritBase: 'Vodka',
    flavorProfiles: ['highball', 'sour'],
    complexity: 'quick',
    glassware: 'Copper Mug or Collins Glass',
    ice: 'Crushed Ice',
    technique: 'Built in Mug',
    ingredients: [
      { name: 'Vodka', amount: '2', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.5', unit: 'oz' },
      { name: 'Ginger Beer', amount: '4', unit: 'oz' },
    ],
    instructions: [
      'Fill a copper mug or highball glass with crushed ice.',
      'Add vodka and fresh lime juice.',
      'Top with spicy ginger beer and stir gently to combine.',
    ],
    garnish: 'Lime Wheel & Fresh Mint Sprig',
    description: 'Crisp, spicy ginger kick with icy refreshment.',
  },
  {
    id: 'cosmopolitan',
    name: 'Cosmopolitan',
    spiritBase: 'Vodka',
    flavorProfiles: ['sour'],
    complexity: 'classic',
    glassware: 'Martini Glass or Coupe',
    ice: 'Served Up',
    technique: 'Shaken',
    ingredients: [
      { name: 'Citrus Vodka', amount: '1.5', unit: 'oz' },
      { name: 'Cointreau or Triple Sec', amount: '0.75', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '0.5', unit: 'oz' },
      { name: 'Cranberry Juice', amount: '0.5', unit: 'oz' },
    ],
    instructions: [
      'Combine citrus vodka, Cointreau, lime juice, and cranberry juice in a shaker with ice.',
      'Shake vigorously for 15 seconds.',
      'Strain into a chilled martini glass.',
    ],
    garnish: 'Flamed Orange Twist',
    description: 'Toby Cecchini\'s 1988 modern icon—vibrant pink hue with tart lime and orange zest.',
  },

  // ==========================================
  // BRANDY / SPRITZ
  // ==========================================
  {
    id: 'sidecar',
    name: 'Classic Sidecar',
    spiritBase: 'Brandy',
    flavorProfiles: ['sour'],
    complexity: 'classic',
    glassware: 'Coupe Glass',
    ice: 'Served Up',
    technique: 'Shaken',
    ingredients: [
      { name: 'Cognac or Brandy', amount: '2', unit: 'oz' },
      { name: 'Cointreau or Triple Sec', amount: '0.75', unit: 'oz' },
      { name: 'Fresh Lemon Juice', amount: '0.75', unit: 'oz' },
    ],
    instructions: [
      'Optional: Sugar half the rim of a chilled coupe glass.',
      'Add cognac, Cointreau, and lemon juice into a shaker with ice.',
      'Shake hard for 15 seconds and double strain into the prepared glass.',
    ],
    garnish: 'Sugar Rim & Orange Twist',
    description: 'Parisian 1920s classic—warming aged cognac balanced with crisp citrus and orange liqueur.',
  },
  {
    id: 'aperol-spritz',
    name: 'Aperol Spritz (3-2-1)',
    spiritBase: 'Amaro / Spritz',
    flavorProfiles: ['highball', 'bitter'],
    complexity: 'quick',
    glassware: 'Wine Glass',
    ice: 'Cubed Ice',
    technique: 'Built in Glass',
    ingredients: [
      { name: 'Prosecco or Sparkling Wine', amount: '3', unit: 'oz' },
      { name: 'Aperol', amount: '2', unit: 'oz' },
      { name: 'Club Soda', amount: '1', unit: 'oz' },
    ],
    instructions: [
      'Fill a large wine glass with ice.',
      'Add Prosecco first, followed by Aperol in an equal circular motion.',
      'Top with a splash of club soda and gently stir.',
    ],
    garnish: 'Fresh Orange Wheel & Green Olive',
    description: 'The golden hour aperitivo—effervescent, bittersweet, and light on alcohol.',
  },
  {
    id: 'americano',
    name: 'Americano',
    spiritBase: 'Amaro / Spritz',
    flavorProfiles: ['highball', 'bitter'],
    complexity: 'quick',
    glassware: 'Highball Glass',
    ice: 'Cubed Ice',
    technique: 'Built in Glass',
    ingredients: [
      { name: 'Campari', amount: '1.5', unit: 'oz' },
      { name: 'Sweet Vermouth', amount: '1.5', unit: 'oz' },
      { name: 'Club Soda', amount: '3', unit: 'oz' },
    ],
    instructions: [
      'Fill a highball glass with ice.',
      'Add equal parts Campari and sweet vermouth.',
      'Top with sparkling club soda and stir gently.',
    ],
    garnish: 'Orange Wheel & Lemon Twist',
    description: '1860s Milanese classic—the ancestor of the Negroni with sparkling effervescence.',
  },
];
