# How to See the New Interactive Auth UI

## Quick Reset

Open your browser console (F12 or Cmd+Option+I) and run:

```javascript
// Clear onboarding flag to see it again
localStorage.removeItem('has_seen_onboarding');

// Then refresh the page
location.reload();
```

## Full Reset (See Everything Fresh)

```javascript
// Clear all app data
localStorage.clear();

// Refresh
location.reload();
```

## What You'll See

### Step 1: Welcome Screen
Just the intro - click "Next"

### Step 2: Choose Your Method
- Two cards: "Meta OAuth (Business)" and "Direct Login (Personal)"
- **Click one of them** to see the interactive preview!

### Step 3: Interactive Auth Preview ✨
**This is the new UI!**

After selecting a method, you'll see:
- A preview window showing realistic auth screens
- Navigation dots at the bottom
- **Click the dots** to navigate between screens:
  - Meta OAuth: Facebook Login → OAuth Permissions → Success
  - Direct Login: Instagram Form → 2FA Screen → Edge Cases List

### Step 4: Final Screen
Ready to publish message

## Troubleshooting

### I see the modal but no preview after selecting method
- Make sure you clicked on one of the two cards in Step 2
- It auto-advances after 500ms
- Try clicking again

### The modal doesn't appear at all
- Run: `localStorage.removeItem('has_seen_onboarding')`
- Disconnect any accounts: `localStorage.clear()`
- Refresh the page
- Wait for loading animation to complete (~13 seconds)

### I want to see it immediately
Add this to your browser console:

```javascript
// Skip to onboarding
localStorage.clear();
// Then go to: http://localhost:3000
// and wait ~13 seconds OR manually trigger it
```

## Manual Trigger (For Testing)

If you want to trigger the onboarding at any time, you can add this temporary button to your page or call it from console:

```javascript
// In browser console - force show onboarding
const event = new CustomEvent('showOnboarding');
window.dispatchEvent(event);
```

## Navigation Tips

Once you're on Step 3 (Interactive Preview):

1. **Look for the dots** at the bottom - these are navigation controls
2. **Click any dot** to jump to that screen
3. **Current dot is wide and colored**, others are small and gray
4. You'll see 3 different screens:
   - Meta: Facebook UI → OAuth → Success
   - Direct: Instagram Login → 2FA → Edge Cases

## Video Walkthrough

1. Open app → See loading (9s) → Completion (4s)
2. Onboarding appears automatically (for new users)
3. Click "Next" on Welcome screen
4. **Click "Meta OAuth" or "Direct Login"** card
5. Watch it auto-advance to Step 3
6. **Click the navigation dots** to see different screens!
7. Click "Next" to continue
8. Click "Get Started" on final screen

---

**The new UI is in Step 3 after selecting a method!** 🎨

