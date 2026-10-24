# Agent Instructions
# 01 Purpose
This file gives AI coding agents the context and rules for working
on this project. Follow these every session.

# 02 Before You Start
- Read docs/PRD.md to understand the product and goals.
- Read docs/DESIGN_SYSTEM.md before building any UI (respect dark/light modes).
- Read docs/ARCHITECTURE.md before creating files or adding tools.
- Check existing components before creating new ones.

# 03 General Rules
- Use TypeScript for all files.
- Follow the design system exactly. No new colours or fonts.
- Reuse existing components wherever possible.
- Keep code modular. One component, one job.
- Don't create unnecessary files.
- Only build what's in the PRD. Ask before adding features like gym tracking.

# 04 Code Guidelines
- Use functional components and modern React hooks.
- Use clear, meaningful names for components and Supabase queries.
- Handle loading, error, and empty states.
- Ensure all layouts are responsive and work across Expo's target platforms (Mobile and PC).

# 05 Security
- Never expose API keys or secrets in code.
- Use environment variables (.env) for Supabase URL and Anon Key.
- Validate all user inputs before sending to the backend.

# 06 Useful Commands
npm install # Install dependencies
npx expo start # Start the Expo development server (Hot Reload)
eas build # Run cloud builds via EAS

# 07 When Unsure
- Check the docs folder first.
- Look at how existing code does it.
- Ask before making big changes.