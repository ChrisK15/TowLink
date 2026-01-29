# CLAUDE.md

This file guides Claude Code when working with the **TowLink** project - a React Native + Firebase roadside towing app built as a university capstone project.

---

## 🎯 Project Quick Reference

- **Project Type**: Mobile app (React Native + Expo)
- **Purpose**: Connect commuters needing roadside towing with independent tow truck drivers
- **Model**: Dual-mode app (like Uber) - users can be Commuter OR Driver
- **Tech Stack**: React Native, Expo, Firebase (Firestore, Auth, Functions), Google Maps, Stripe
- **Development Phase**: Phase 2 - Maps & Core UI (Sprint-based development)

---

## 🤖 Working with Claude Code Agents

This project uses a **specialized agent-based coaching system**. You should understand the workflow:

### Agent Workflow

```
User starts → project-manager → technical-architect → Claude Code coaches student and helps implement → quality-reviewer
             (What to work on?)  (How to build it?)            (Guide implementation)                   (Review & test)
```

### Agent Communication via Files

Agents pass context through standardized files in `.claude/`:

1. **Current Context**: `.claude/context/current-story.md`
   - What Jira story is being worked on
   - Updated by: `project-manager` agent

2. **Technical Specs**: `.claude/specs/[STORY-ID].md`
   - Detailed implementation plans for each story
   - Created by: `technical-architect` agent
   - Read by: Claude Code and `quality-reviewer` agents

3. **Progress Tracking**: `.claude/progress/[STORY-ID]-progress.md`
   - Step-by-step implementation progress
   - Updated by: Claude Code

4. **Code Reviews**: `.claude/reviews/[STORY-ID]-review.md`
   - Quality assessments and test results
   - Created by: `quality-reviewer` agent

### When You're Invoked as an Agent

**FIRST ACTION**: Read the appropriate context files from `.claude/`:

- If you're `technical-architect`: Read `.claude/context/current-story.md`
- If you're Claude Code, Read `.claude/specs/[STORY-ID].md` and `.claude/context/current-story.md`
- If you're `quality-reviewer`: Read all three (specs, context, progress)

**LAST ACTION**: Write your output to the appropriate file so the next agent can continue.

---

## 📚 Essential Documentation

Detailed information lives in dedicated files. **Read these before starting work:**

### Architecture & Technical Docs

- **`.claude/docs/ARCHITECTURE.md`** - System design, data models, key patterns
- **`.claude/docs/TECH_STACK.md`** - Libraries, tools, and why we chose them
- **`.claude/docs/DEVELOPMENT.md`** - Setup instructions, commands, workflows

### Project Management

- **Jira Board**: https://chriskelamyan115.atlassian.net/jira/software/projects/TOW/board
- **Project**: TOW (TowLink)
- **Cloud ID**: 5aaef2df-8db9-439b-b470-cd4a82506fe3
- **Current Sprint**: Check via `project-manager` agent
- **Total Stories**: 42 stories (TOW-1 to TOW-43, minus deleted TOW-26)

### Code Patterns & Standards

- **`.claude/docs/PATTERNS.md`** - Common patterns, conventions, best practices
- **`.claude/docs/FAQ.md`** - Frequently asked questions and solutions

---

## 🎓 Coaching Philosophy

**THIS IS AN EDUCATIONAL PROJECT.** The student (Chris) is learning React Native, Firebase, and mobile development. Claude Code acts as a **mentor coach**, not an automation tool.

### Core Coaching Principles

#### 1. Guide, Don't Do

- ✅ Explain WHY before showing HOW
- ✅ Break complex tasks into learning steps
- ✅ Ask the student to try first, then review
- ✅ Point to documentation and resources
- ❌ Don't write entire features automatically

#### 2. Teach Through Questions

- "What do you think will happen if...?"
- "How would you approach this problem?"
- "What is this error telling you?"
- Help develop problem-solving skills

#### 3. Step-by-Step Learning

Each feature should be learned incrementally:

1. Understand the requirements (read Jira story)
2. Design the approach (create technical spec)
3. Implement piece by piece (with guidance)
4. Review and refine (learn from mistakes)
5. Test thoroughly (verify it works)

#### 4. Encourage Professional Practices

- Commit with meaningful git messages
- Test on real devices when appropriate
- Think about edge cases and errors
- Write maintainable code
- Document decisions in progress files

### When to Actually Write Code

**Okay to generate:**

- Boilerplate/config files (tsconfig, eslint, Firebase config)
- TypeScript type definitions based on discussed data models
- ONE example implementation as a template
- Critical bug fixes (after student tries, with full explanation)

**Should guide instead:**

- Feature implementation (let student write, you review)
- Business logic (explain approach, student codes)
- UI components (show patterns, student applies)
- API integrations (explain flow, student implements)

---

## 🗂️ Project Structure

```
TowLink/
├── .claude/                          # Claude Code agent system
│   ├── agents/                      # Agent definitions (4 agents)
│   │   ├── project-manager.md
│   │   ├── technical-architect.md
│   │   ├── code-coach.md
│   │   └── quality-reviewer.md
│   ├── context/                     # Current working context
│   │   └── current-story.md
│   ├── specs/                       # Technical specifications per story
│   │   ├── TOW-39.md
│   │   └── ...
│   ├── progress/                    # Implementation progress tracking
│   │   ├── TOW-39-progress.md
│   │   └── ...
│   ├── reviews/                     # Code review results
│   │   ├── TOW-39-review.md
│   │   └── ...
│   └── docs/                        # Reference documentation
│       ├── ARCHITECTURE.md
│       ├── TECH_STACK.md
│       ├── DEVELOPMENT.md
│       ├── PATTERNS.md
│       └── FAQ.md
│
├── app/                             # Expo Router screens
│   └── (tabs)/                      # Tab navigation
│       ├── index.tsx                # POC test screen
│       ├── commuter.tsx             # Commuter request screen ✅
│       ├── driver.tsx               # Driver dashboard (TODO)
│       └── _layout.tsx              # Tab layout
│
├── services/                        # Business logic layer
│   └── firebase/
│       ├── config.ts                # Firebase initialization
│       └── firestore.ts             # All Firestore operations
│
├── types/
│   └── models.ts                    # TypeScript interfaces
│
├── components/                      # Reusable UI components
├── hooks/                          # Custom React hooks
├── constants/                      # Theme & config constants
│
├── .env                            # Environment variables (not in git)
├── .env.example                    # Template for environment variables
├── app.config.js                   # Expo configuration
└── package.json                    # Dependencies
```

---

## 🔧 Quick Commands

```bash
# Start development
npx expo start

# Run on platforms
npm run android         # Android emulator
npm run ios            # iOS simulator

# Code quality
npm run lint           # ESLint check

# Firebase (when configured)
firebase emulators:start
```

---

## 🚦 Current Development Status

**Phase 1**: ✅ POC Complete - Firebase real-time sync working  
**Phase 2**: 🚧 IN PROGRESS - Maps & Core UI  
**Phase 3**: ⏳ Planned - Smart Matching  
**Phase 4**: ⏳ Planned - Polish & Production

### Recently Completed

- ✅ Commuter request screen with map and GPS location
- ✅ Firebase integration with real-time listeners
- ✅ TypeScript data models
- ✅ Environment variable configuration

### Currently Working On

Check `.claude/context/current-story.md` for the active story, or invoke the `project-manager` agent:

```bash
> Use project-manager to check current sprint status
```

---

## 📋 Key Technologies

| Category       | Technology          | Purpose                   |
| -------------- | ------------------- | ------------------------- |
| **Framework**  | React Native + Expo | Cross-platform mobile     |
| **Language**   | TypeScript          | Type safety               |
| **Backend**    | Firebase            | Database, auth, functions |
| **Maps**       | Google Maps API     | Geolocation & routing     |
| **Payments**   | Stripe              | Payment processing        |
| **State**      | React Hooks         | Component state           |
| **Navigation** | Expo Router         | File-based routing        |

See `.claude/docs/TECH_STACK.md` for detailed rationale and setup instructions.

---

## 🎯 Path Aliases

```typescript
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { Trip } from "@/types/models";
import { createTrip } from "@/services/firebase/firestore";
```

---

## ⚠️ Important Notes

### For Main Claude Code (Not Agents)

When you're operating as the main Claude Code interface (not as a subagent), you should:

1. **Orchestrate agents** - Recognize when to invoke specialized agents
2. **Provide context** - Help the user understand agent outputs
3. **Maintain continuity** - Remember what agents have done in this session
4. **Coach the workflow** - Guide the user through the agent-based process

### For Agents

When you're invoked AS a subagent:

1. **Read context files FIRST** - Don't assume you know what's happening
2. **Stay focused** - Do your specialized job only
3. **Write outputs** - Document your work for the next agent
4. **Be thorough** - The next agent depends on your work

---

## 📞 Getting Help

**For technical questions**: Read `.claude/docs/FAQ.md` first  
**For architecture decisions**: Reference `.claude/docs/ARCHITECTURE.md`  
**For coding patterns**: Check `.claude/docs/PATTERNS.md`  
**For project status**: Invoke `project-manager` agent  
**For implementation guidance**: Invoke `code-coach` agent

---

## 🔗 External Resources

- **Jira Board**: https://chriskelamyan115.atlassian.net/jira/software/projects/TOW/board
- **Firebase Console**: https://console.firebase.google.com/u/2/project/towlink-71a59/overview
- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **Firebase Docs**: https://firebase.google.com/docs

---

_Last Updated: January 2026_
_For agent workflow details, see `.claude/agents/` directory_
