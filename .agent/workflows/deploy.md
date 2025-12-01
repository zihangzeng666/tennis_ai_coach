---
description: How to deploy the Tennis AI Coach application
---

# Deploying Tennis AI Coach

Since this is a Next.js application, the easiest way to deploy it is using **Vercel**.

## Option 1: Deploy to Vercel (Recommended)

1.  **Push to GitHub**:
    -   Ensure your project is pushed to a GitHub repository.
    -   If you haven't initialized git:
        ```bash
        git init
        git add .
        git commit -m "Ready for deployment"
        # Create a repo on GitHub and follow instructions to push
        ```

2.  **Connect to Vercel**:
    -   Go to [vercel.com](https://vercel.com).
    -   Sign up/Login.
    -   Click **"Add New..."** -> **"Project"**.
    -   Import your GitHub repository.

3.  **Configure**:
    -   Vercel will automatically detect it's a Next.js app.
    -   The default settings (Build Command: `next build`, Output Directory: `.next`) are usually correct.
    -   Click **"Deploy"**.

4.  **Done!**:
    -   Vercel will build your site and provide you with a live URL (e.g., `tennis-ai-coach.vercel.app`).

## Option 2: Run Locally in Production Mode

If you just want to run the optimized version on your machine:

1.  **Build**:
    ```bash
    npm run build
    ```

2.  **Start**:
    ```bash
    npm start
    ```
    -   The app will run at `http://localhost:3000`, but it will be much faster and optimized than the `dev` mode.

## Important Note on Large Files
-   You have large video files in `public/background_videos`. Vercel has a limit on file sizes (usually 100MB for the free tier, but total deployment size matters).
-   If deployment fails due to size, consider hosting the videos on an external storage (like AWS S3, Cloudinary, or YouTube) and updating the URLs in `src/components/UploadZone.tsx`.
