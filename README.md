# 🔐 Supabase Authentication Template

A modern, secure, and production-ready authentication template built with **Next.js 14** and **Supabase**. This template provides a complete authentication system with multiple OAuth providers, and a beautiful responsive UI.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## ✨ Features

### 🔒 **Authentication & Security**
- **Email/Password Authentication** - Secure user registration and login
- **Multiple OAuth Providers** - Google, Apple, and more

- **Email Verification** - Secure email confirmation system
- **Password Reset** - Secure password recovery flow
- **JWT Token Management** - Automatic session handling
- **Protected Routes** - Route-level authentication guards

### 🎨 **UI/UX**
- **Modern Design** - Clean, professional interface
- **Responsive Layout** - Perfect on desktop, tablet, and mobile
- **Smooth Animations** - Engaging user interactions
- **Dark/Light Mode** - Theme switching support
- **Form Validation** - Real-time input validation
- **Loading States** - Beautiful loading indicators

### ⚡ **Performance**
- **Next.js 14** - Latest features and optimizations
- **Server Components** - Enhanced performance
- **Optimized Images** - Automatic image optimization
- **Code Splitting** - Efficient bundle loading
- **SEO Optimized** - Meta tags and structured data

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or later
- **npm**, **yarn**, **pnpm**, or **bun**
- **Supabase Account** - [Create one here](https://supabase.com)
- **Google OAuth Credentials** (optional)
- **Apple Developer Account** (optional)


### Installation

1. **Clone the repository**
```bash
git clone https://github.com/wardaowais/Supabase-Next-Auth-Template.git
cd supabase-auth-template
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_PROJECT_ID=your_project_id

# Database Password (for reference)
NEXT_PUBLIC_SUPABASE_PASSWORD=your_database_password



# OAuth Providers (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_APPLE_CLIENT_ID=your_apple_client_id
```

4. **Configure Supabase**

In your Supabase dashboard:

- Go to **Authentication** → **Settings**
- Add your site URL: `http://localhost:3000`
- Configure OAuth providers (Google, Apple, etc.)
- Enable email confirmations if desired



6. **Run the development server**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## 📁 Project Structure

```
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   └── reset-password/
│   ├── dashboard/
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   ├── ui/
│   ├── auth/
│   ├── Navbar.js
│   └── Footer.js
├── lib/
│   ├── supabase/
│   │   ├── client.js
│   │   └── server.js
│   └── utils.js
├── public/
└── README.md
```

## 🔧 Configuration

### Supabase Setup

1. **Create a new Supabase project**
2. **Go to Settings** → **API**
3. **Copy your URL and anon key**
4. **Add to your `.env.local` file**

### OAuth Providers

#### Google OAuth
1. Go to [Google Console](https://console.developers.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
6. Add client ID to Supabase Auth settings

#### Apple OAuth
1. Go to [Apple Developer](https://developer.apple.com/)
2. Create a new identifier
3. Configure Sign in with Apple
4. Add client ID to Supabase Auth settings



## 🎯 Usage

### Basic Authentication

```javascript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Sign out
const { error } = await supabase.auth.signOut()
```

### OAuth Authentication

```javascript
// Google OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}/auth/callback`
  }
})

// Apple OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'apple',
  options: {
    redirectTo: `${origin}/auth/callback`
  }
})
```

### Protected Routes

```javascript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/sign-in')
  }
  
  return <div>Protected content</div>
}
```

## 🚀 Deployment

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

1. **Push your code to GitHub**
2. **Import your repository to Vercel**
3. **Add environment variables** in Vercel dashboard
4. **Update Supabase settings** with your production URL
5. **Deploy!**

### Other Deployment Options

- **Netlify** - Static site hosting
- **Railway** - Full-stack deployment
- **Digital Ocean** - VPS deployment
- **AWS Amplify** - Serverless deployment

## 🔍 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | ✅ |
| `NEXT_PUBLIC_SUPABASE_PROJECT_ID` | Your Supabase project ID | ✅ |

| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | ❌ Optional |
| `NEXT_PUBLIC_APPLE_CLIENT_ID` | Apple OAuth client ID | ❌ Optional |




## 🛠️ Customization

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Custom Components** - Reusable UI components
- **Theme Configuration** - Easy color and font customization

### Adding New OAuth Providers
1. Configure provider in Supabase dashboard
2. Add client credentials to environment variables
3. Update OAuth component with new provider

### Custom Authentication Flow
- Modify components in `/components/auth/`
- Update authentication logic in `/lib/supabase/`
- Add custom validation rules

## 📚 Learn More

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - Interactive Next.js tutorial
- [Next.js GitHub repository](https://github.com/vercel/next.js)

### Supabase Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 🙋‍♂️ Support

If you have any questions or need help, please:

- Open an issue on GitHub
- Check the [documentation](https://supabase.com/docs)
- Join the [Supabase Discord](https://discord.supabase.com/)

## 🌟 Show Your Support

If this project helped you, please give it a ⭐ on GitHub!

---

**Built with ❤️ using Next.js and Supabase**
