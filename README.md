# ResoRights AI ⚖️

> **California Legal Information & Rights Navigation Platform**  
> Plain-English explanations of California law, actionable next steps, and intelligent case organization for tenants, consumers, and residents.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web-0D2B4E.svg)](#)
[![Jurisdiction](https://img.shields.io/badge/Jurisdiction-California%20(USA)-1E40AF.svg)](#)
[![Workflow](https://img.shields.io/badge/Backend-n8n%20Automation-FF6D5A.svg)](#)

---

## 📌 Overview

**ResoRights AI** is a serious, production-grade civic-tech platform designed to empower California residents navigating legal disputes, consumer conflicts, debt challenges, and scams. Instead of opaque legal jargon or generic AI chatbot answers, ResoRights AI connects plain-English user descriptions with California statutes, clear legal rights, and concrete next steps.

Built with a civic-tech design philosophy inspired by state digital services and reputable legal aid organizations (like California.gov and Nolo), ResoRights AI avoids AI startup clichés in favor of clarity, trust, and accessibility.

---

## 🏛️ Supported Legal Domains

ResoRights AI provides targeted guidance across four core areas of California law:

| Category | Primary California Statutes & Rules | Key Issues Handled |
| :--- | :--- | :--- |
| **Housing & Tenant Rights** | Cal. Civ. Code § 1950.5, § 1941.1, § 1946.2 (Tenant Protection Act) | Security deposit non-return, 21-day itemization rules, repair and habitability claims, eviction notice reviews. |
| **Credit & Debt Collection** | Rosenthal Act (Cal. Civ. Code § 1788), Federal FDCPA (15 U.S.C. § 1692) | Debt collector harassment, workplace calls, unlawful arrest threats, credit report dispute procedures (FCRA). |
| **Consumer Protection** | Song-Beverly Consumer Warranty Act (Cal. Civ. Code § 1790), Small Claims | Defective products, merchant refund refusals, undelivered merchandise, chargeback timelines. |
| **Scams & Fraud Prevention** | FTC Guidelines, California Dept. of Justice Reporting Protocols | Bank impersonation fraud, phishing schemes, fake government notices, fraudulent unauthorized charges. |

---

## ✨ Features & Architecture

- **Intelligent Case Tracking**: Organize multiple ongoing situations in a collapsible sidebar. Each conversation is indexed by preview text, category badge, and timestamp.
- **Session Continuity with `conversation_id`**: Every case maintains a distinct, cryptographically unique session identifier (`conv_...`), allowing the automation backend to maintain state, context, and memory across multiple messages.
- **Full Case Management**: Users can switch cases, start fresh cases, or delete individual conversations at any time with instant UI updates.
- **Dynamic Shutter Transition**: Smooth, native-feeling page curtain transition between landing and assistant interfaces.
- **Resilient Webhook Pipeline**: Connects with an external intake webhook (n8n / automation engine) with built-in fail-safe handling and sanitized user messaging (no technical server traces or URLs exposed to the user).
- **Responsive Civic Design**: 100% responsive across desktop, tablet, and mobile with high-contrast accessibility standards.

---

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, Modern ES6+ JavaScript.
- **Styling**: Tailored design system with custom CSS variables, typography (Source Serif 4 & Inter), micro-animations, and subtle status feedback.
- **Backend / Automation**: Webhook-based integration compatible with n8n workflows, Pinecone vector store, Cohere embeddings, and LLM classification models.
- **Storage**: Client-side storage via `localStorage` for user preferences and customizable webhook endpoints.

---

## 🔒 Privacy & Security by Design

- **No Public Credential Exposure**: Sensitive backend workflows and API credentials are kept strictly out of the repository via rigorous `.gitignore` configurations.
- **Protected Webhook Endpoints**: Default connection endpoints are encoded to prevent plain-text harvesting and scraping by web crawlers.
- **No Mandatory Accounts**: No personal identity or login is required to explore legal rights and receive guidance.
- **Zero Tracker Tracking**: Built with privacy-first standards suitable for sensitive legal and financial inquiries.

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/MuhaammadAbubakar/ResoRights-AI.git
cd ResoRights-AI
```

### 2. Run Locally
You can run ResoRights AI directly in any browser:
- Double-click `index.html` to open in your browser, or
- Use a lightweight local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js npx
npx serve .
```

### 3. Webhook Setup
To connect your own automation backend:
1. Open the application.
2. Click the **Settings** modal in the application or configure your webhook in `localStorage`:
   ```javascript
   localStorage.setItem('rr_webhook_url', 'YOUR_WEBHOOK_URL_HERE');
   ```
3. Incoming payload structure sent by the frontend:
   ```json
   {
     "message": "User query here",
     "prompt": "User query here",
     "text": "User query here",
     "conversation_id": "conv_m2a9x1_8k20f",
     "case_id": "RR-2024-0043",
     "category": "Housing",
     "history": [
       { "role": "assistant", "content": "..." },
       { "role": "user", "content": "..." }
     ]
   }
   ```

---

## ⚠️ Legal Disclaimer

ResoRights AI is an educational legal information tool and civic-technology resource. **It is not a law firm, does not provide legal representation, and does not provide formal legal advice.** The information provided is based on publicly available California statutes and consumer protection resources. Users facing active court hearings, time-sensitive legal actions, or complex litigation should consult a licensed California attorney or local legal aid organization (such as [LawHelpCalifornia.org](https://www.lawhelpcalifornia.org)).

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

Developed by [Muhammad Abubakar](https://github.com/MuhaammadAbubakar)
