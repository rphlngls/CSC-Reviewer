# Civil Service Exam Practice

A browser-based, 150-question Philippine Civil Service Exam practice test. It runs as a static website and can be published with GitHub Pages.

## Run it on your computer

The page loads its question bank from `questions.json`, so serve the folder over HTTP rather than opening `index.html` directly.

1. Open a terminal in this folder.
2. Run `python -m http.server 8000`.
3. Visit <http://localhost:8000>.

## Publish with GitHub Pages

1. Create a new GitHub repository and add these website files and the `.github/workflows/deploy-pages.yml` workflow.
2. Push the files to the repository's `main` or `master` branch.
3. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
4. Open the **Actions** tab and wait for **Deploy practice exam to GitHub Pages** to finish. The deployment job displays the website URL.

The workflow publishes only the static website files. The Python command-line version remains in the repository but is not included in the published site.

## About the practice test

The site includes 40 Verbal Ability, 40 Analytical Ability, 40 Numerical Ability, and 30 General Information questions. The full exam has a three-hour timer and an 80% passing mark. After submitting, you can retry missed questions until you get them right. Answers are processed in your browser and are not uploaded or saved to a server.
