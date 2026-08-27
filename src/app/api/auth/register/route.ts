import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        name: name || cleanEmail.split('@')[0],
      },
    });

    // Populate initial "Always Available" kitchen staples
    const defaultStaples = [
      { name: 'Kosher Salt', category: 'spices' },
      { name: 'Black Pepper', category: 'spices' },
      { name: 'Extra Virgin Olive Oil', category: 'pantry' },
      { name: 'Unsalted Butter', category: 'fridge' },
      { name: 'Fresh Garlic', category: 'pantry' },
      { name: 'All-Purpose Flour', category: 'pantry' },
      { name: 'Granulated Sugar', category: 'pantry' },
    ];

    await db.pantryItem.createMany({
      data: defaultStaples.map((item) => ({
        name: item.name,
        normalizedName: normalizeIngredientName(item.name),
        category: item.category,
        isAlwaysAvailable: true,
        userId: user.id,
      })),
    });

    return NextResponse.json(
      {
        message: 'Account created successfully.',
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
