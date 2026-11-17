import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authenticate } from '@/server/accounts';
import { db } from '@/lib/db';
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 30 * 86400 },
  pages: { signIn: '/auth/login' },
  trustHost: process.env.AUTH_TRUST_HOST === 'true',
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (c) => authenticate(c.email, c.password),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.sv = (user as unknown as { sessionVersion: number }).sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.uid === 'string') {
        const current = await db.user.findUnique({
          where: { id: token.uid },
          select: { sessionVersion: true },
        });
        if (current && current.sessionVersion === token.sv) session.user.id = token.uid;
        else session.user.id = '';
      }
      return session;
    },
  },
});
