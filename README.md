# SkillQuest Navigator

Build a modern, polished, responsive web application called “SkillQuest”, a gamified early learning-disability screening companion designed for university students at DUT (Durban University of Technology).

PURPOSE

The goal is NOT to diagnose learning disabilities or calculate IQ. The system should provide a fun, low-pressure gaming experience that collects gameplay data and identifies patterns that MAY indicate areas where a student could benefit from professional assessment by the DUT Disability Unit.

The experience should feel like a modern gaming/brain-training platform rather than a clinical assessment.

Take UX/gameplay inspiration from platforms such as IXL, CrazyGames, Lumosity, MemoryMatching.com, 7ESL, CrazyMathsGames, Freefocusgames.com and similar educational/brain-training websites, but DO NOT copy their branding, layouts, assets or exact game designs. Create an original DUT-appropriate identity.

BRANDING & VISUAL STYLE

Create a distinctive, youthful university-gaming aesthetic.

Primary colours:

Deep navy: #101828

Electric purple: #7C3AED

Vibrant blue: #2563EB

Cyan accent: #06B6D4

White: #FFFFFF

Light background: #F8FAFC

Success: #16A34A

Warning: #F59E0B

Risk/error: #DC2626

Use dark navy/purple gradients selectively for hero sections and game interfaces.

Typography should be modern, highly readable and accessible. Use rounded cards, subtle shadows, smooth animations, progress bars, badges, icons and responsive layouts.

The design must feel appropriate for UNIVERSITY STUDENTS, not young children.

CORE EXPERIENCE

Create the following flow:

Landing page

Student registration/login

Student dashboard

Screening session selection

Six game categories

Progressive difficulty

Gameplay tracking

Skill checkpoint after every 10 levels

Performance analysis

Student screening report

Recommendation to contact/book with the DUT Disability Unit when appropriate

Screening history/progress dashboard

SIX GAME DOMAINS

1. NUMBER CHALLENGE
For mathematical/numeracy difficulty indicators.
Include:

Arithmetic challenges

Number sequences

Pattern recognition

Comparisons

Mental calculations

Increasingly difficult problems
Track accuracy, response time, mistakes, attempts and completion time.

2. WORD CHALLENGE
For reading/spelling/language-related difficulty indicators.
Include:

Word matching

Scrabble-style challenges

Spelling

Crosswords

Missing letters

Word recognition

Grammar-related challenges

3. MEMORY MATCH
For working-memory indicators.
Include:

Flip-and-match cards

Sequence recall

Pattern recall

Remember-and-repeat challenges

Increasing number of objects/sequences

4. READING CHALLENGE
For reading comprehension and instruction-following.
Include:

Short passages

Comprehension questions

Instruction-following challenges

Word recognition

Timed reading activities

5. LOGIC & SCENARIO
For reasoning and decision-making.
Present realistic university/life scenarios where the student chooses an appropriate response.
Include:

Logical puzzles

Problem-solving

Sequencing

Scenario-based decisions

Cause-and-effect questions

6. ATTENTION CHALLENGE
For concentration and sustained attention.
Include:

Reaction games

Focus challenges

Target identification

Distraction/filtering challenges

Sustained attention tasks

GAMEPLAY SYSTEM

Every category should have progressive levels:

Level 1–10: Beginner
Level 11–20: Easy/Intermediate
Level 21–30: Intermediate
Level 31–40: Advanced
Level 41+: Expert

Do NOT simply make questions harder. Increase difficulty intelligently through:

Time pressure

Number of elements

Complexity

Distractors

Memory load

Number of steps

Reduced hints

More difficult reasoning

Every game should have:

Start screen

Instructions

Countdown where appropriate

Main gameplay

Immediate but non-judgemental feedback

Score/progress

Level completion screen

Retry/continue options

XP/reward system

Streaks and badges

Make gameplay feel responsive and satisfying with subtle animations, transitions, sounds/visual feedback where appropriate and clear interaction states.

IMPORTANT CHECKPOINT SYSTEM

After every 10 completed levels, trigger a Skill Checkpoint.

The checkpoint should contain questions/tasks related to skills practiced in the previous 10 levels.

Do not make it feel like an exam. Present it as a short “challenge round”.

The system should compare checkpoint performance with gameplay performance and track consistency.

DATA COLLECTION

For every relevant interaction, record:

Accuracy

Response time

Number of attempts

Errors

Level reached

Completion time

Hints used

Retry behaviour

Performance consistency

Checkpoint performance

Use these metrics to build a student skill profile.

ADAPTIVE DIFFICULTY

Implement adaptive difficulty.

If a student performs consistently well, gradually increase difficulty.

If a student struggles repeatedly, reduce difficulty or provide an appropriate easier challenge.

Do not punish students for struggling.

The system should detect PERFORMANCE PATTERNS rather than judging a single mistake.

SCREENING ANALYSIS

At the end of a screening session, analyse performance across the six domains.

Display understandable categories such as:

Low concern

Moderate concern

Higher concern

Avoid claiming that the student HAS dyslexia, dyscalculia, ADHD or any other disability.

Do NOT generate an IQ score.

Instead show a skill profile such as:

Reading Skills — Strong
Mathematical Skills — Needs Monitoring
Memory — Developing
Attention — Needs Monitoring
Logical Reasoning — Strong
Language/Word Skills — Developing

Include a clear disclaimer:

“This result is a screening indicator, not a medical or psychological diagnosis. If you have concerns about your learning experience, consider contacting the DUT Disability Unit for professional assessment and support.”

STUDENT DASHBOARD

Create a polished dashboard showing:

Welcome message

Overall screening progress

XP

Current level

Streak

Badges

Six skill-domain cards

Recent checkpoint results

Recommended games

Screening history

“View My Screening Report” button

“Get Support” button

Do not make the dashboard feel like a school marks portal.

STAFF/DISABILITY UNIT DASHBOARD

Create a separate staff interface.

Staff should be able to:

View students who have completed screening

See flagged profiles

View individual screening reports

View screening history

Filter by risk level/domain

View performance trends

Record follow-up actions

Recommend professional assessment

Manage student cases

Use privacy-conscious design and only show information appropriate for authorised staff.

ADMINISTRATION

Create an admin interface for:

User management

Staff accounts

System configuration

Game/category management

Access control

Audit/history information

ACCESSIBILITY

Accessibility is a core requirement.

Include:

Keyboard navigation

High contrast

Clear typography

Large interactive controls

Screen-reader-friendly structure

Reduced-motion consideration

Simple instructions

Avoid relying solely on colour

Accessible error and success messages

PRIVACY & SECURITY

Design the system around South African POPIA principles.

Student data must be treated as sensitive.
Use:

Secure authentication

Role-based access

Appropriate access controls

Minimal data exposure

Clear explanation of how gameplay data is used

Consent before screening/data sharing where appropriate

UI PAGES TO BUILD

Build polished versions of:

Landing Page

Login

Registration

Student Dashboard

Game Selection

Number Challenge

Word Challenge

Memory Match

Reading Challenge

Logic & Scenario

Attention Challenge

Skill Checkpoint

Results/Screening Report

Screening History

Student Profile

Disability Unit Dashboard

Student Detail/Case View

Admin Dashboard

Settings/Accessibility

DESIGN PRINCIPLE

The most important principle is:

“It should feel like playing a game, not being tested for a disability.”

Students should feel curious, motivated and comfortable rather than judged.

Use gamification elements such as XP, levels, streaks, badges, progress bars, achievements and encouraging feedback, but NEVER use language that shames the student or makes them feel unintelligent.

TECHNICAL IMPLEMENTATION

Build the application as a functional responsive web app.

Use a clean component-based architecture and reusable game components.

Use realistic mock data if a backend/database is not available yet.

Make all buttons, navigation, games, levels, progress tracking, dashboards and interactions functional rather than static mockups.

Prioritise:

Excellent UX

Functional gameplay

Responsive design

Accessibility

Clear screening workflow

Maintainable architecture

The final product should look like a credible university technology project that could eventually be developed into a real DUT Disability Unit screening platform—not a generic AI-generated dashboard.

Before implementing, think through the complete user journey and information architecture, then build the application.

I want the users to enjoy visiting the app ) and the app's response, I want the app(on the gamification process and how the games respond) to be like these following sites but still differ from them by fulfilling the app's primary functionalities and the goal of the app: IXL, CrazyMathsGames, 7x.games, 7ESL, MemoryMatching.com, Crazygames, Lumosity, Freefocusgames.com and other game like this

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/97878efe-fffb-4916-9af5-8f8e516fcc0d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
