# Deploy / Alias Checklist (Production)

**Problem we observed**  
- `rig-troubleshooter.vercel.app` and the long preview domain are serving *older* builds.
- Our new routes (`/fingerprint`, `/api/fingerprint`, `/api/edge-fingerprint`) 404 on both.
- Different `X-Vercel-Id` values across domains => different deployments/projects are being served.

**Goal**  
Make **Production** point to the **latest deployment** of this repository (the one that contains `/fingerprint`).

## Steps (Vercel Dashboard)

1) **Open the Project**  
   - Go to Vercel → Projects → locate the project that receives GitHub pushes for this repo.
   - Confirm that its Deployments list shows the last commit SHA printed by our app footer (see below).

2) **Promote the Latest Deployment to Production**  
   - In the Deployments tab, select the deployment with the **latest commit SHA** (the one Cursor prints).
   - Click **Promote to Production** (or redeploy Production if promotion is disabled).

3) **Check Domain Mapping**  
   - Project → **Settings** → **Domains**  
   - Ensure `rig-troubleshooter.vercel.app` is attached to this project (not some other project).
   - If the domain is attached to a different project, remove it there and add it to the correct one.

4) **Verify Live**  
   - Visit:
     - `https://rig-troubleshooter.vercel.app/fingerprint`
     - `https://rig-troubleshooter.vercel.app/api/fingerprint`
     - `https://rig-troubleshooter.vercel.app/api/edge-fingerprint`
   - All three should return JSON/HTML that contains the marker `FST-RIG-TS-FP` and the current commit.

If any of the above still fails **after promotion**, re-check Domain attachment and that the project you're viewing is the *same* one GitHub pushes are building.

## Rollback
If you need to rollback, promote a previous deployment in the same Deployments tab.
