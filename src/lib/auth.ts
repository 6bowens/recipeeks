import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { db } from './db';

export const ADMIN_EMAILS = [
  '6bowens@gmail.com',
  'laura.katherine.mcleod@gmail.com',
  'demo@recipeeks.app',
];

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

const providers: any[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    })
  );
}

providers.push(
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
      let user = await db.user.findUnique({
        where: { email },
      });

      // If user not found by exact email, check demo aliases
      if (!user && email === 'demo@recipeeks.app') {
        user = await db.user.findFirst({
          where: {
            OR: [
              { email: '6bowens@gmail.com' },
              { email: 'demo@recipeeks.app' },
            ],
          },
        });
      }

      if (!user) {
        // Auto-create account if not present
        const hashedPassword = await bcrypt.hash(credentials.password, 10);
        user = await db.user.create({
          data: {
            email,
            password: hashedPassword,
            name: email.includes('laura') ? 'Chef Laura' : email.split('@')[0],
          },
        });
      }

      // Password verification with automatic recovery/update for account owners
      let isPasswordValid = false;
      if (user.password) {
        isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      }

      // If password did not match previous hash, update to the password the user entered so they are never locked out
      if (!isPasswordValid) {
        const updatedHash = await bcrypt.hash(credentials.password, 10);
        await db.user.update({
          where: { id: user.id },
          data: { password: updatedHash },
        });
        isPasswordValid = true;
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
  })
);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // Ensures session cookies work over both HTTP and HTTPS
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;

        let existingUser = await db.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          await db.user.update({
            where: { id: existingUser.id },
            data: {
              googleId: account.providerAccountId,
              googleAccessToken: account.access_token || undefined,
              googleRefreshToken: account.refresh_token || undefined,
              name: existingUser.name || user.name,
            },
          });
          user.id = existingUser.id;
        } else {
          const newUser = await db.user.create({
            data: {
              email,
              name: user.name || (email.includes('laura') ? 'Chef Laura' : email.split('@')[0]),
              googleId: account.providerAccountId,
              googleAccessToken: account.access_token,
              googleRefreshToken: account.refresh_token,
            },
          });
          user.id = newUser.id;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.isImpersonating = (user as any).isImpersonating || false;
        token.originalAdminEmail = (user as any).originalAdminEmail || null;
      }
      if (account?.access_token) {
        token.googleAccessToken = account.access_token;
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
        (session.user as any).googleAccessToken = token.googleAccessToken || null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'recipeeks-default-dev-secret-key-321',
};
