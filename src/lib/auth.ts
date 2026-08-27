import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';

export const ADMIN_EMAILS = ['6bowens@gmail.com'];

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'chef@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please provide both email and password.');
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user) {
          throw new Error('No user found with this email.');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error('Incorrect password.');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split('@')[0],
        };
      },
    }),
    CredentialsProvider({
      id: 'impersonate',
      name: 'Impersonate',
      credentials: {
        targetUserId: { label: 'Target User ID', type: 'text' },
        adminEmail: { label: 'Admin Email', type: 'text' },
        secretKey: { label: 'Secret Key', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.targetUserId || !credentials?.adminEmail || !credentials?.secretKey) {
          throw new Error('Invalid impersonation credentials.');
        }

        const adminEmail = credentials.adminEmail.toLowerCase().trim();
        if (!isUserAdmin(adminEmail)) {
          throw new Error('Unauthorized: Admin access required.');
        }

        const expectedSecret = process.env.NEXTAUTH_SECRET || 'recipeeks-default-dev-secret-key-321';
        if (credentials.secretKey !== expectedSecret) {
          throw new Error('Invalid impersonation secret key.');
        }

        const targetUser = await db.user.findUnique({
          where: { id: credentials.targetUserId },
        });

        if (!targetUser) {
          throw new Error('Target user not found.');
        }

        const isReturningToAdmin = targetUser.email.toLowerCase() === adminEmail;

        return {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name || targetUser.email.split('@')[0],
          isImpersonating: !isReturningToAdmin,
          originalAdminEmail: adminEmail,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.isImpersonating = (user as any).isImpersonating || false;
        token.originalAdminEmail = (user as any).originalAdminEmail || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        (session.user as any).isImpersonating = token.isImpersonating || false;
        (session.user as any).originalAdminEmail = token.originalAdminEmail || null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'recipeeks-default-dev-secret-key-321',
};
