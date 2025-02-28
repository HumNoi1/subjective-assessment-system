// lib/auth/nextAuthConfig.js
import { SupabaseAdapter } from "@auth/supabase-adapter";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "../supabase/client";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "อีเมล", type: "email" },
        password: { label: "รหัสผ่าน", type: "password" }
      },
      async authorize(credentials) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) return null;
        return data.user;
      }
    }),
  ],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }),
  callbacks: {
    async session({ session, user }) {
      // ดึงข้อมูลเพิ่มเติมของผู้ใช้จาก Supabase
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (data) {
        session.user.id = data.teacher_id;
        session.user.name = data.name;
        session.user.role = 'teacher';
      }

      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };