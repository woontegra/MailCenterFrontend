# MailCenter Frontend

Modern SaaS email management panel built with React + TypeScript.

## 🎨 Design System

**Typography:**
- Font: Inter (Google Fonts)
- Weights: 300 (light), 400 (normal), 500, 600
- Sizes: text-xs, text-sm, text-base

**Colors:**
- Primary: Blue (#0ea5e9)
- Gray scale: 50, 100, 200, 600, 900
- Accent colors for tags

**Spacing:**
- Padding: p-4, p-6
- Rounded corners: rounded-xl
- Shadows: shadow-sm

**Design Philosophy:**
- Minimal and clean
- Apple / Linear / Stripe inspired
- Lots of whitespace
- Soft shadows
- No bold UI elements

## 🚀 Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Query** - Data fetching & caching
- **Zustand** - State management
- **Axios** - HTTP client
- **React Router** - Routing
- **Lucide React** - Icons
- **date-fns** - Date formatting

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── mail/
│       └── MailDetail.tsx
├── pages/
│   ├── auth/
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── Dashboard.tsx
│   ├── Inbox.tsx
│   ├── Accounts.tsx
│   └── Tags.tsx
├── layouts/
│   └── MainLayout.tsx
├── services/
│   └── api.ts
├── store/
│   └── authStore.ts
├── types/
│   └── index.ts
├── App.tsx
├── main.tsx
└── index.css
```

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Server

```bash
npm run dev
```

App will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

## 📱 Pages

### Auth Pages
- **Login** - Email + password authentication
- **Register** - Create new account with company name

### Dashboard
- Unread mail count
- Starred mail count
- Total accounts
- Account list with stats

### Inbox
- Mail list with preview
- Star/unstar mails
- Mark as read/unread
- Delete mails
- Tag badges
- Mail detail panel

### Accounts
- List all email accounts
- Add new IMAP account
- Delete accounts

### Tags
- List all tags
- Create new tags with colors
- Color picker

## 🎯 Features

### Authentication
- JWT token stored in localStorage
- Auto-redirect on 401
- Protected routes

### Mail Management
- Real-time updates with React Query
- Optimistic updates
- Auto-refresh on mutations
- Mail detail side panel

### UI/UX
- Responsive design
- Loading states
- Error handling
- Smooth transitions
- Hover effects

## 🔌 API Integration

All API calls go through `src/services/api.ts`:

```typescript
// Auth
authApi.login(email, password)
authApi.register(email, password, tenantName)

// Mails
mailApi.getMails(params)
mailApi.updateRead(id, is_read)
mailApi.updateStar(id, is_starred)
mailApi.deleteMail(id)

// Dashboard
dashboardApi.getStats()

// Accounts
accountApi.getAccounts()
accountApi.createAccount(data)

// Tags
tagApi.getTags()
tagApi.createTag(data)
```

## 🎨 Component Examples

### Button Styles

```tsx
// Primary button
<button className="px-4 py-2.5 bg-primary-500 text-white text-sm font-normal rounded-xl hover:bg-primary-600 transition-colors">
  Click me
</button>

// Secondary button
<button className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-normal rounded-xl hover:bg-gray-200 transition-colors">
  Cancel
</button>
```

### Input Styles

```tsx
<input
  type="text"
  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  placeholder="Enter text..."
/>
```

### Card Styles

```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  Content
</div>
```

## 🔄 State Management

### Auth Store (Zustand)

```typescript
const { token, user, setAuth, logout } = useAuthStore()
```

Persisted to localStorage automatically.

### React Query

```typescript
// Fetch data
const { data, isLoading } = useQuery({
  queryKey: ['mails'],
  queryFn: mailApi.getMails,
})

// Mutate data
const mutation = useMutation({
  mutationFn: mailApi.deleteMail,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['mails'] })
  },
})
```

## 📝 TODO

- [ ] Compose mail modal
- [ ] Mail search functionality
- [ ] Filters (unread, starred, by account)
- [ ] Pagination
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Email templates
- [ ] Attachments support

## 🎯 Design Principles

1. **Minimal** - No unnecessary elements
2. **Clean** - Lots of whitespace
3. **Modern** - Rounded corners, soft shadows
4. **Fast** - Optimistic updates, instant feedback
5. **Accessible** - Semantic HTML, keyboard navigation

## 🚀 Performance

- Code splitting with React Router
- Lazy loading components
- React Query caching
- Optimistic updates
- Debounced search (when implemented)

## 📦 Build Output

```bash
npm run build
```

Outputs to `dist/` folder, ready for deployment.

## 🌐 Deployment

Can be deployed to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting

Just build and upload the `dist/` folder.
