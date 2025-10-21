# 👋 START HERE - Student Recruitment Dashboard

## 🎯 What This Dashboard Does

Tracks your student recruitment efforts in **real-time** across three platforms:

### 📧 **Mailchimp - Lead Tracking**
- Total leads this week (with % change)
- Applicant conversion rate
- Weekly growth trends
- Lead source breakdown

### 🔗 **Bitly - Link Performance**
- All student recruitment links
- Total clicks and trends
- Traffic sources (Google, Facebook, etc.)
- Geographic distribution

### 🎫 **Ticket Tailor - Event Management**
- All upcoming open days/events
- Capacity and tickets sold
- Attendance tracking
- No-show rates

---

## 🚀 Three Simple Steps

### Step 1: Get API Keys (5 min)
Read: **[API_GUIDE.md](API_GUIDE.md)** for detailed instructions

**Quick version:**
- **Mailchimp**: Account → API Keys → Create
- **Bitly**: Settings → API → Generate Token
- **Ticket Tailor**: Settings → API → Generate Key

### Step 2: Deploy to Netlify (2 min)
Read: **[QUICK_START.md](QUICK_START.md)** for step-by-step

**Quick version:**
1. Zip this folder
2. Go to netlify.com/drop
3. Drag and drop the zip

### Step 3: Add Your Keys (3 min)
In Netlify dashboard, add 5 environment variables (see API_GUIDE.md)

**Done!** Your dashboard is live at your Netlify URL.

---

## 📚 Documentation

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| **[QUICK_START.md](QUICK_START.md)** | Deploy in 10 minutes | 5 min |
| **[API_GUIDE.md](API_GUIDE.md)** | Get all your API keys | 10 min |
| **[README.md](README.md)** | Complete documentation | 20 min |

---

## ✅ What You'll See

### **Executive Dashboard**
Four KPI cards showing:
- Total Leads (with weekly % change) ✨
- Applicants (with conversion rate)
- Link Clicks (30-day total)
- Upcoming Events count

### **Visual Analytics**
- Lead generation trend (12 weeks)
- Traffic sources breakdown
- Geographic distribution
- Event capacity metrics

### **Detailed Tables**
- Sortable events list
- All recruitment links with performance

---

## 🎓 Important Setup Notes

### **In Mailchimp:**
When someone becomes an applicant → Tag them "Applicant"
- This stops recruitment automation
- Dashboard calculates: Leads = Total - Applicants

### **In Bitly:**
Tag your recruitment links with "student-recruitment"
- Dashboard only shows tagged links
- Use consistent tagging for best results

### **In Ticket Tailor:**
Enable check-in for attendance tracking
- Dashboard calculates no-show rates
- Optional but recommended

---

## 🎯 Who Is This For?

**Perfect if you're:**
- Student recruitment manager
- Marketing coordinator
- Admissions team member
- Need real-time recruitment insights

**Academic Year:** October - August
**Region:** UK Higher Education (adaptable)

---

## 💡 Key Features

✅ **Real-time updates** - See data as it happens
✅ **Auto-refresh** - Updates every 30 seconds
✅ **Mobile friendly** - Access on any device
✅ **No servers to manage** - Fully serverless
✅ **Secure** - API keys never exposed
✅ **Free hosting** - Netlify free tier

---

## 🔧 Customization

Want to adjust timeframes or filters?

Edit these in `/public/index.html`:
```javascript
// Change tracking period
weeks: 12  // Lead tracking (default: 12 weeks)
days: 30   // Link tracking (default: 30 days)
```

See README.md for full customization options.

---

## 📊 Success Metrics

You'll know it's working when:
- ✅ Dashboard loads at your URL
- ✅ Total Leads shows a number
- ✅ Links appear in the table
- ✅ Events are listed
- ✅ Charts display data

---

## 🆘 Quick Troubleshooting

**Dashboard shows errors?**
1. Check browser console (F12)
2. Verify all 5 environment variables are set
3. Redeploy after adding variables
4. See API_GUIDE.md troubleshooting section

**No data appearing?**
- Mailchimp: Check audience ID
- Bitly: Tag your links "student-recruitment"
- Ticket Tailor: Publish at least one event

---

## ⏱️ Time Investment

- **Setup**: 10 minutes (one-time)
- **Daily use**: 2 minutes to check dashboard
- **Weekly review**: 15 minutes to analyze trends
- **Maintenance**: 5 minutes/month

---

## 🎉 Ready to Start?

### Choose Your Path:

**🏃 Fast Track** (For experienced users)
→ Go straight to [QUICK_START.md](QUICK_START.md)

**📚 Complete Guide** (First-time deployers)
→ Start with [API_GUIDE.md](API_GUIDE.md) then [QUICK_START.md](QUICK_START.md)

**🔍 Learn Everything** (Want full details)
→ Read [README.md](README.md) for comprehensive guide

---

## 💼 What's Included

```
student-recruitment-dashboard/
│
├── START_HERE.md          ← You are here
├── QUICK_START.md         ← 10-minute deployment
├── API_GUIDE.md           ← Get your API keys  
├── README.md              ← Full documentation
│
├── public/
│   └── index.html         ← Dashboard interface
│
├── netlify/
│   └── functions/         ← API integrations
│       ├── mailchimp.js   ← Lead tracking
│       ├── bitly.js       ← Link analytics
│       └── ticket-tailor.js ← Event management
│
├── netlify.toml           ← Netlify config
├── package.json           ← Dependencies
└── .env.example           ← API keys template
```

---

## 🎓 Academic Year Tracking

The dashboard automatically shows:
- Current recruitment cycle
- Oct-Aug academic year format
- UK higher education conventions

---

## 🌟 What Makes This Different

Unlike generic analytics tools:
- ✅ **Purpose-built** for student recruitment
- ✅ **All-in-one** - Mailchimp + Bitly + Events
- ✅ **Weekly metrics** - Perfect for recruitment cycles
- ✅ **Conversion tracking** - Lead → Applicant
- ✅ **Event-focused** - Open days and attendance

---

## 📞 Need Help?

1. **Check the docs** - Everything is documented
2. **Browser console** - Shows specific errors (F12)
3. **Netlify logs** - Check Functions logs in dashboard
4. **API services** - Verify keys work in each platform

---

## 🚀 Next Steps

1. **Read** [QUICK_START.md](QUICK_START.md) ← Start here!
2. **Get** your API keys ([API_GUIDE.md](API_GUIDE.md))
3. **Deploy** to Netlify
4. **Configure** environment variables
5. **Access** your live dashboard
6. **Track** your recruitment success!

---

## 💰 Cost

**Free!** Netlify free tier includes:
- 100GB bandwidth/month
- 125k function requests/month  
- HTTPS + custom domains
- More than enough for this dashboard

---

**Let's get your dashboard live!** 🎉

Pick a guide and follow along:
- Quick deployer? → [QUICK_START.md](QUICK_START.md)
- Need API help? → [API_GUIDE.md](API_GUIDE.md)
- Want details? → [README.md](README.md)

---

*Built specifically for UK higher education student recruitment teams*
*October - August recruitment cycle*
*Real-time insights for better decision-making*
