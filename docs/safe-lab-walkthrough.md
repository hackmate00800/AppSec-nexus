# AppSec Nexus --- Safe Lab Testing Walkthrough

## 1. Setting Up a Local Vulnerable Lab
To practice offensive and defensive security safely, always use dedicated, offline, intentionally vulnerable applications.

### Option A: OWASP Juice Shop
1. Run with Docker:
   ```bash
   docker run -d -p 3000:3000 bkimminich/juice-shop
   ```
2. Or run via Node.js:
   ```bash
   git clone https://github.com/juice-shop/juice-shop.git
   cd juice-shop
   npm install
   npm start
   ```

### Option B: OWASP WebGoat
1. Run with Docker:
   ```bash
   docker run -p 8080:8080 -p 9090:9090 -e TZ=Europe/Amsterdam webgoat/webgoat
   ```

## 2. Configuring AppSec Nexus for Local Testing
By default, AppSec Nexus blocks all loopback addresses (`127.0.0.1`, `localhost`) to prevent SSRF vulnerabilities.

To scan your local lab:
1. Navigate to **Target Management** in AppSec Nexus.
2. Enter the Target Name: `OWASP Juice Shop (Local Lab)`.
3. Enter Primary URL: `http://localhost:3000`.
4. **Important:** Check the box **"Allow Local Lab / Loopback testing"**.
5. Click **"Add Target Scope"**.

## 3. Running Scans & Analyzing Findings
1. Go to **Vulnerability Scanner**.
2. Select your local lab target.
3. Run the **Native Baseline Security Checks** to audit HTTP headers and cookie security flags.
4. Run the **Web Crawler** with depth `2` to harvest all reachable endpoints.
5. In the **Findings Hub**, select any discovered issue and click **"Consult AI Mentor"** to get an offline remediation guide with code examples.
