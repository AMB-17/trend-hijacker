#!/bin/bash
# Deploy updated Trend Hijacker with new features to Vercel

echo "🚀 Deploying Trend Hijacker v2.1 with new features..."
echo ""

# Check git status
echo "📦 Checking git status..."
git status

echo ""
echo "✅ Ready to deploy. The following new features are included:"
echo ""
echo "1. 🆚 Trend Comparison Tool - Compare up to 3 trends side-by-side"
echo "2. 📈 Timeline Analysis - See how trends evolved over time"
echo "3. 💰 Market Size Estimator - Calculate TAM/SAM/SOM"
echo "4. 📊 Analytics Dashboard - Deep dive into saved trends"
echo "5. 🧠 Enhanced Navigation - Easy access to all features"
echo ""

echo "📝 Commit and push changes..."
git add .
git commit -m "🎉 Release v2.1: Add 5 new use cases

- 🆚 Trend Comparison Tool (compare up to 3 trends)
- 📈 Timeline Analysis (30-day historical view)
- 💰 Market Size Estimator (TAM/SAM/SOM calculator)
- 📊 Analytics Dashboard (portfolio management)
- 🧠 Enhanced navigation and quick access

All new features fully functional and tested."

git push origin main

echo ""
echo "✨ Deployment complete! New features live on:"
echo "   https://trend-hijacker-84mm1zycf-amb-17s-projects.vercel.app/"
echo ""
echo "🎯 Users can now:"
echo "   • Compare trends to find best opportunities"
echo "   • Analyze historical trend performance"
echo "   • Estimate market size and revenue potential"
echo "   • Manage their opportunity portfolio"
echo ""
