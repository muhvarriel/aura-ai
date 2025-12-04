# 🔒 Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions of Aura AI:

| Version | Supported          | Status        |
| ------- | ------------------ | ------------- |
| 0.1.x   | ✅ Yes             | Active        |
| < 0.1   | ❌ No              | Not supported |

---

## 🚨 Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Aura AI, please help us by responsibly disclosing it to us.

### Where to Report

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **Email:** Send details to **[66511068+muhvarriel@users.noreply.github.com](mailto:66511068+muhvarriel@users.noreply.github.com)**
2. **Subject Line:** Use format: `[SECURITY] Brief description of issue`

### What to Include

Please provide as much information as possible:

- **Type of vulnerability** (e.g., XSS, SQL injection, authentication bypass)
- **Full path** of source file(s) related to the vulnerability
- **Location** of the affected source code (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact** of the vulnerability
- **Possible fix** (if you have suggestions)

### Example Report Format

```markdown
**Vulnerability Type:** Cross-Site Scripting (XSS)

**Affected Component:** src/presentation/components/ui/MarkdownView.tsx

**Description:** 
User input is not properly sanitized before rendering...

**Steps to Reproduce:**
1. Navigate to roadmap page
2. Enter malicious script in topic field
3. Observe script execution

**Impact:** 
Attacker can execute arbitrary JavaScript in victim's browser

**Suggested Fix:**
Implement proper input sanitization using DOMPurify
```

---

## ⏰ Response Timeline

We are committed to addressing security issues promptly:

| Timeline | Action |
|----------|--------|
| **< 24 hours** | Initial acknowledgment of your report |
| **< 7 days** | Detailed response with our assessment |
| **< 30 days** | Fix implemented and tested (severity dependent) |
| **< 45 days** | Public disclosure (coordinated with reporter) |

### Severity Levels

- **Critical:** Immediate attention, fix within 7 days
- **High:** Priority fix within 14 days
- **Medium:** Fix within 30 days
- **Low:** Fix in next scheduled release

---

## 🎯 Security Best Practices

### For Users

#### API Key Management

- ❌ **Never commit** API keys to version control
- ✅ **Always use** environment variables (`.env.local`)
- ✅ **Rotate keys** regularly
- ✅ **Use different keys** for development and production

**Bad Example:**
```typescript
// ❌ NEVER DO THIS
const apiKey = "gsk_abc123xyz";
```

**Good Example:**
```typescript
// ✅ DO THIS
const apiKey = process.env.GROQ_API_KEY;
```

#### Environment Variables

```bash
# .env.local (never commit this file)
GROQ_API_KEY=your_secret_key_here
```

Add to `.gitignore`:
```gitignore
.env.local
.env*.local
```

### For Contributors

#### Code Review Checklist

- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user inputs
- [ ] Proper error handling (no sensitive data in errors)
- [ ] Dependencies are up-to-date
- [ ] No `eval()` or dangerous functions
- [ ] SQL queries use parameterized statements
- [ ] Authentication/authorization checks in place

#### Secure Coding Guidelines

1. **Input Validation**
   ```typescript
   // ✅ Validate all user inputs
   const topicSchema = z.string().min(3).max(100).trim();
   const validatedTopic = topicSchema.parse(userInput);
   ```

2. **Output Encoding**
   ```typescript
   // ✅ Sanitize before rendering
   import DOMPurify from 'dompurify';
   const cleanHTML = DOMPurify.sanitize(userContent);
   ```

3. **Error Handling**
   ```typescript
   // ❌ Bad: Exposes sensitive info
   catch (error) {
     return res.json({ error: error.message });
   }
   
   // ✅ Good: Generic error message
   catch (error) {
     console.error('[Error]', error);
     return res.json({ error: 'An error occurred' });
   }
   ```

---

## 🔐 Data Privacy

### What We Collect

Aura AI operates with minimal data collection:

- **Local Storage Only:** Roadmaps are stored in browser localStorage
- **No User Accounts:** No personal information collected
- **API Requests:** Only the topics you enter are sent to AI service

### Third-Party Services

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| Groq AI | Roadmap generation | User-entered topics only |

### Data Retention

- **Browser Storage:** Data persists until manually cleared
- **API Logs:** Not stored by our application
- **Analytics:** None implemented (privacy-first)

---

## 🛡️ Security Features

### Current Implementation

- ✅ **Client-side validation** for all inputs
- ✅ **Environment variable** protection
- ✅ **No database** (reduces attack surface)
- ✅ **Type-safe** codebase with TypeScript
- ✅ **Dependency scanning** (npm audit)

### Planned Security Enhancements

- 🔄 **Rate limiting** on API routes
- 🔄 **CSRF protection**
- 🔄 **Content Security Policy (CSP)** headers
- 🔄 **API request signing**
- 🔄 **Automated security scanning** in CI/CD

---

## 📖 Dependencies Security

### Keeping Dependencies Secure

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# Update dependencies
npm update
```

### Dependency Review Process

Before adding new dependencies:

1. Check npm package page for:
   - Last update date
   - Number of maintainers
   - Known vulnerabilities
   - Download statistics

2. Review:
   - Package permissions
   - Source code (if possible)
   - License compatibility

---

## ⚖️ Disclosure Policy

### Coordinated Disclosure

We follow responsible disclosure practices:

1. **Private Report:** Vulnerability reported privately to maintainers
2. **Investigation:** We investigate and develop a fix
3. **Fix Release:** Security patch released
4. **Public Disclosure:** Details disclosed publicly (with credit to reporter)

### Public Disclosure Timeline

- **Ideal:** 90 days after initial report
- **Minimum:** 30 days after fix is released
- **Exception:** Critical vulnerabilities may be disclosed sooner

---

## 🏆 Security Hall of Fame

We appreciate security researchers who help keep Aura AI secure. Researchers who responsibly disclose vulnerabilities will be:

- Listed here (with permission)
- Credited in release notes
- Invited to contribute to the project

### Contributors

*No vulnerabilities reported yet. Be the first!*

---

## 📞 Contact

For security concerns:

- **Email:** [66511068+muhvarriel@users.noreply.github.com](mailto:66511068+muhvarriel@users.noreply.github.com)
- **PGP Key:** Coming soon

For general questions:

- **GitHub Issues:** [Open an issue](https://github.com/muhvarriel/aura-ai/issues)
- **Discussions:** [GitHub Discussions](https://github.com/muhvarriel/aura-ai/discussions)

---

## 📝 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

---

**Last Updated:** December 5, 2025

**Version:** 1.0
