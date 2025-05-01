// src/app/layout.js
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

<script src="https://ucarecdn.com/libs/widget/3.x/uploadcare.full.min.js"></script>


export const metadata = {
  title: 'AI Video Transform',
  description: 'Powered by Fal API',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
