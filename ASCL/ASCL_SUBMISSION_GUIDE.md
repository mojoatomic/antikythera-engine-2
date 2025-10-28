# ASCL Submission Guide - Antikythera Engine

## What is ASCL?

The **Astrophysics Source Code Library (ASCL)** is a free online registry for source codes of interest to astronomers and astrophysicists. ASCL listings are:

- **Indexed by NASA ADS** - Automatic discovery by researchers
- **Citable** - Receive a permanent identifier like a DOI
- **Peer-reviewed** - Editorial board reviews all submissions
- **Permanent** - Once accepted, permanently archived

**Website:** https://ascl.net/

## Why Submit to ASCL?

### Academic Recognition
- **Citation ID**: Get a permanent identifier (e.g., ascl:2025.001)
- **NASA ADS**: Automatic indexing in Astrophysics Data System
- **Google Scholar**: Appears in citation databases
- **CV/Resume**: Legitimate publication to list

### Community Visibility
- **Discoverability**: Astronomers search ASCL for tools
- **Credibility**: Editorial review validates quality
- **Network**: Connect with other astronomy software developers
- **Impact**: See who cites your work

### For Antikythera Engine Specifically
- **Educational validation**: Recognition of educational value
- **Historical significance**: Acknowledges ancient astronomy connection
- **Technical validation**: NASA HORIZONS comparison documented
- **Community service**: Helps astronomy educators worldwide

## Your Software's Strengths

### Technical Excellence
✅ **NASA-validated accuracy**: 1.4 arcsec median error  
✅ **Comprehensive testing**: 100% pass rate on validation  
✅ **Professional documentation**: Complete API and validation docs  
✅ **Reproducible results**: Validation scripts included

### Educational Value
✅ **Accessibility**: Simple REST API for teaching  
✅ **Historical context**: Ancient astronomy connection  
✅ **Practical utility**: Physical mechanism control  
✅ **Open source**: MIT license for unrestricted use

### Unique Position
✅ **Niche filled**: Educational ephemeris API doesn't exist elsewhere  
✅ **Bridge**: Connects historical and modern astronomy  
✅ **Multi-purpose**: Digital displays AND physical devices  
✅ **Quality**: Sub-10-arcsecond precision with simple interface

**Your software deserves ASCL recognition!**

## Submission Package Contents

This package includes everything you need:

### 📋 For Quick Submission
**`ASCL_submission_form.md`**  
Pre-filled form content ready to copy/paste into ASCL web form. Just replace placeholders and submit!

### 📄 For Reference/Context
**`ASCL_submission_detailed.md`**  
Comprehensive submission document with full technical details, validation results, use cases, and rationale. Use this to answer detailed questions from reviewers.

### 🏷️ For Your Repository
**`CITATION.cff`**  
Add to repository root. GitHub auto-generates citation formats. Required for proper citation support.

**`VALIDATION.md`**  
Add to `docs/` directory. Complete NASA HORIZONS validation documentation with methodology, results, and reproduction instructions.

### ✅ For Tracking Progress
**`SUBMISSION_CHECKLIST.md`**  
Print this! Step-by-step checklist to track your submission from preparation through acceptance.

### 📖 This Guide
Explains the ASCL process, timeline, and why your software matters.

## Submission Process (3 Steps)

### Step 1: Prepare Repository (15 minutes)

Add the documentation files:

```bash
# Copy files to your repository
cp CITATION.cff /path/to/antikythera-engine-2/
cp VALIDATION.md /path/to/antikythera-engine-2/docs/

# Commit and tag
cd /path/to/antikythera-engine-2/
git add CITATION.cff docs/VALIDATION.md
git commit -m "Add citation and validation docs for ASCL submission"
git tag v2.0.0
git push origin main --tags
```

Verify your repository is:
- ✅ Public (not private)
- ✅ Has README with API documentation
- ✅ Includes validation scripts
- ✅ Has MIT license file
- ✅ Tagged with version number

### Step 2: Fill Placeholders (5 minutes)

In `ASCL_submission_form.md` and `CITATION.cff`, replace:

- `[YOUR_USERNAME]` → Your GitHub username
- `[YOUR_NAME]` / `[YOUR_FIRST_NAME]` / `[YOUR_LAST_NAME]` → Your actual name
- `[YOUR_EMAIL]` → Your email address
- `[YOUR_ORCID]` → Your ORCID (or remove line if you don't have one)

**ORCID Info**: ORCID is a free researcher ID. Get one at https://orcid.org/ (optional but recommended)

### Step 3: Submit Online (10 minutes)

1. Go to https://ascl.net/submit
2. Create account if needed (free)
3. Open `ASCL_submission_form.md`
4. Copy/paste each section into the web form
5. Double-check all URLs work
6. Click Submit!

**That's it!** Total time: ~30 minutes

## Timeline

### Week 0: Submission
- **You:** Submit via web form
- **ASCL:** Send confirmation email

### Week 1-2: Initial Review
- **ASCL:** Editor reviews submission
- **You:** Respond to any questions within 48 hours

**Common questions:**
- Clarify target audience
- Explain validation methodology
- Describe use cases
- Verify documentation accessibility

### Week 2-3: Technical Review
- **ASCL:** Technical review of software and documentation
- **You:** Address technical feedback

**Possible requests:**
- Add examples to README
- Clarify dependencies
- Explain coordinate systems
- Provide additional validation details

### Week 3-4: Final Review
- **ASCL:** Final acceptance review
- **You:** Make any last minor revisions

### Week 4+: Acceptance! 🎉
- **ASCL:** Assign permanent ID (e.g., ascl:2510.042)
- **You:** Update repository with ASCL badge
- **Automatic:** NASA ADS indexing (no action needed)

**Total timeline:** 3-4 weeks typical

## After Acceptance

### Update Your Repository

Add ASCL badge to README.md:
```markdown
[![ASCL](https://img.shields.io/badge/ascl-YYMM.NNN-blue.svg)](https://ascl.net/YYMM.NNN)
```

Update CITATION.cff with ASCL ID:
```yaml
identifiers:
  - type: ascl
    value: "ascl:YYMM.NNN"
```

### Promote Your Work

- **CV/Resume**: Add under "Publications" or "Software"
- **Social media**: Share your ASCL listing
- **Department website**: Link to ASCL entry
- **Blog post**: Write about the process (optional)
- **Email signature**: Add ASCL link (optional)

### Maintain Your Software

ASCL expects:
- ✅ Repository remains accessible
- ✅ Software continues to work
- ✅ Critical bugs are fixed
- ✅ Major updates are communicated

You don't need to:
- ❌ Provide ongoing feature development
- ❌ Offer user support 24/7
- ❌ Fix every small bug immediately
- ❌ Update for every dependency change

## What Makes a Good ASCL Submission?

### Strong Applications (Like Yours!)

✅ **Clear scientific/educational purpose**: Antikythera Engine teaches astronomy  
✅ **Documented validation**: NASA HORIZONS comparison  
✅ **Reproducible results**: Validation scripts included  
✅ **Active maintenance**: GitHub shows recent commits  
✅ **Quality documentation**: README, API docs, validation guide  
✅ **Open source**: MIT license

### Weak Applications (Not Your Problem!)

❌ Purely commercial software  
❌ No documentation  
❌ Private repositories  
❌ Unvalidated results  
❌ Single-use scripts  
❌ No clear scientific utility

**Your software checks ALL the boxes!**

## Reviewer Expectations

ASCL reviewers look for:

### Scientific/Educational Value
**Question:** "Does this help astronomers or astronomy education?"  
**Your answer:** ✅ Educational demonstrations, planetarium displays, historical astronomy research

### Code Quality
**Question:** "Is the code well-written and maintained?"  
**Your answer:** ✅ 220+ test cases, minimal dependencies, active development

### Documentation
**Question:** "Can users understand and use the software?"  
**Your answer:** ✅ Comprehensive README, API docs, validation guide, examples

### Validation
**Question:** "How accurate/reliable is this software?"  
**Your answer:** ✅ NASA HORIZONS validated, sub-10-arcsecond precision, reproducible tests

### Accessibility
**Question:** "Can others access and use this?"  
**Your answer:** ✅ Open source (MIT), GitHub public, platform-independent, minimal setup

## Comparison to Other Software

ASCL reviewers may ask how your software differs from existing tools:

### vs. JPL HORIZONS
**HORIZONS:** Batch interface, technical complexity  
**Yours:** REST API, educational simplicity  
**Advantage:** Lower barrier to entry for educators

### vs. PyEphem/Skyfield (Python libraries)
**Python libs:** Require programming knowledge  
**Yours:** Simple HTTP requests, language-agnostic  
**Advantage:** Accessible to non-programmers

### vs. Stellarium (Desktop app)
**Stellarium:** User interface, desktop-only  
**Yours:** Server-based, remote control, physical mechanisms  
**Advantage:** Integration into automated systems

### vs. Commercial planetarium software
**Commercial:** Expensive, proprietary, closed source  
**Yours:** Free, open source (MIT), validated accuracy  
**Advantage:** Academic accessibility, customization

**Your unique position:** Educational-focused API with validated accuracy and physical mechanism control support

## Handling Reviewer Questions

### Validation Questions

**Q:** "How do you know this is accurate?"  
**A:** Point to `docs/VALIDATION.md` - NASA HORIZONS comparison shows 1.4 arcsec median error across 7 bodies

**Q:** "Can we reproduce your validation?"  
**A:** Yes! Run `node scripts/validate-all-bodies.js` - full methodology documented

**Q:** "What's your error tolerance?"  
**A:** 0.1° (360 arcsec) threshold; actual performance 1.4-8.6 arcsec

### Use Case Questions

**Q:** "Who would use this?"  
**A:** Astronomy educators, planetarium operators, museum exhibits, historical astronomy researchers

**Q:** "What's the advantage over existing tools?"  
**A:** Simple API + validated accuracy + physical device control in one package

**Q:** "Why the Antikythera mechanism connection?"  
**A:** Historical context makes astronomy education more engaging; same computational outputs

### Technical Questions

**Q:** "What astronomical theories do you use?"  
**A:** VSOP87 (planets), ELP2000 (Moon) via astronomy-engine library

**Q:** "What coordinate systems?"  
**A:** Topocentric ecliptic (observer-relative); documented in API responses

**Q:** "Dependencies?"  
**A:** astronomy-engine v2.1.19 (primary), Express.js (API server), Node.js v14+

## Success Indicators

You'll know your submission is successful when:

1. **Confirmation email** arrives (immediate)
2. **Editor assignment** notification (week 1)
3. **Technical questions** from reviewers (week 2-3) - this is GOOD!
4. **Acceptance notification** email (week 3-4)
5. **ASCL ID assigned** (e.g., ascl:2510.042)
6. **NASA ADS indexing** completed automatically (week 4-5)
7. **Citations appear** when others use your software (ongoing)

## Common Rejection Reasons (Not Your Problem!)

ASCL rejects submissions that:
- ❌ Lack scientific/educational value → **You have clear educational purpose**
- ❌ Have no documentation → **You have comprehensive docs**
- ❌ Can't be accessed → **GitHub public repo**
- ❌ Aren't maintained → **Active development shown**
- ❌ Have commercial restrictions → **You're MIT licensed**

**Your submission is strong!**

## Frequently Asked Questions

### "Do I need to publish a paper first?"
**No!** ASCL accepts software independently. Papers are optional.

### "What if my software changes after submission?"
Update your GitHub repo normally. Inform ASCL of major version changes.

### "Can I submit software I use only internally?"
Software should be accessible to others. If GitHub public, you're good!

### "What if I find bugs after submission?"
Fix them on GitHub. ASCL entries point to living repositories.

### "How long does ASCL registration last?"
Permanent! Once accepted, always in the registry.

### "What if I don't have an ORCID?"
Optional but recommended. Get free at https://orcid.org/

### "Can I update my ASCL entry later?"
Yes! Contact ASCL editors for significant changes.

### "What if reviewers request major changes?"
Unlikely given your strong validation. Minor clarifications more typical.

## Tips for Success

### Before Submitting
✅ Test all URLs in incognito browser  
✅ Verify repository is public  
✅ Run validation scripts successfully  
✅ Check documentation for typos  
✅ Ensure README is current

### During Review
✅ Respond to emails within 48 hours  
✅ Be friendly and professional  
✅ Provide additional details willingly  
✅ Update documentation if requested  
✅ Thank reviewers for their time

### After Acceptance
✅ Add ASCL badge to README  
✅ Update CITATION.cff with ID  
✅ Share your accomplishment  
✅ Maintain software quality  
✅ Help users who cite your work

## Your Advantage

**You're already ahead!** Most ASCL submissions need to:
- Add validation documentation (you have it!)
- Improve their README (yours is excellent!)
- Create citation files (CITATION.cff ready!)
- Demonstrate accuracy (NASA HORIZONS validated!)

**Your submission is publication-ready.**

## Contact Information

**ASCL Website:** https://ascl.net/  
**Submission Form:** https://ascl.net/submit  
**Guidelines:** https://ascl.net/wordpress/submission-guidelines/  
**ASCL Editors:** editors@ascl.net  

**For questions about YOUR submission materials:**  
Review `ASCL_submission_detailed.md` or ask me!

## Next Steps

1. **Now**: Read `SUBMISSION_CHECKLIST.md` and print it
2. **Today**: Update placeholders in form and citation files
3. **Today**: Add CITATION.cff and VALIDATION.md to your repo
4. **Today**: Submit via https://ascl.net/submit
5. **This week**: Watch for confirmation email
6. **Weeks 2-4**: Respond to reviewer questions
7. **Month 1**: Receive acceptance and ASCL ID! 🎉

## You've Got This!

**Your software:**
- ✅ Solves real educational needs
- ✅ Has validated accuracy
- ✅ Is professionally documented
- ✅ Follows best practices
- ✅ Serves the astronomy community

**You're ready to submit!**

The astronomy education community will benefit from your work. ASCL registration will give your software the professional recognition it deserves.

---

## Appendix: ASCL Entry Example

Here's what your final ASCL entry might look like:

```
Antikythera Engine
ASCL ID: ascl:2510.042
Language: JavaScript
Registered: October 2025

Antikythera Engine calculates real-time positions of celestial bodies 
(Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn) with NASA-validated 
sub-10-arcsecond precision. The system provides structured outputs for 
both digital visualization and physical mechanism control, recreating 
the computational capabilities of the ancient Antikythera mechanism 
using modern astronomical calculations.

Validated against NASA JPL HORIZONS with typical errors of 1.4 arcseconds, 
the software serves astronomy educators, planetarium operators, and 
historical astronomy researchers. The API supports educational 
demonstrations, planetarium displays, and physical orrery control systems.

Code site: https://github.com/[USERNAME]/antikythera-engine-2
Described in: [future papers citing your work will appear here]
Bibcode: 2025ascl.soft10042F
Preferred citation method: https://ascl.net/2510.042/cite
```

**That's what you're working toward!** 🌟
