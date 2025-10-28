# ASCL Submission Checklist - Antikythera Engine

**Print this checklist and track your progress!**

## Pre-Submission Preparation

### Repository Updates
- [ ] Add `CITATION.cff` to repository root
- [ ] Add `VALIDATION.md` to `docs/` directory
- [ ] Ensure README.md is up-to-date with validation info
- [ ] Create git tag for version 2.0.0
- [ ] Push all changes and tags to GitHub

```bash
# Commands to run:
cp CITATION.cff /path/to/antikythera-engine-2/
cp VALIDATION.md /path/to/antikythera-engine-2/docs/
cd /path/to/antikythera-engine-2/
git add CITATION.cff docs/VALIDATION.md
git commit -m "Add citation and validation docs for ASCL submission"
git tag v2.0.0
git push origin main --tags
```

### Information Gathering
- [ ] Confirm GitHub repository URL
- [ ] Prepare author information (name, email, ORCID if available)
- [ ] Review software license (MIT confirmed)
- [ ] Verify all dependencies listed
- [ ] Check that validation scripts run successfully

### Document Review
- [ ] Read through `ASCL_submission_detailed.md` for context
- [ ] Review `ASCL_submission_form.md` for accuracy
- [ ] Replace all `[YOUR_USERNAME]` placeholders with actual GitHub username
- [ ] Replace all `[YOUR_NAME]` placeholders with actual name
- [ ] Replace all `[YOUR_EMAIL]` placeholders with actual email
- [ ] Replace all `[YOUR_ORCID]` placeholders (or remove if none)

## Submission Process

### ASCL Website
- [ ] Go to https://ascl.net/submit
- [ ] Create ASCL account if needed
- [ ] Review ASCL submission guidelines

### Form Completion
Use `ASCL_submission_form.md` to fill in:

- [ ] Software Name: "Antikythera Engine"
- [ ] Short Description (copy from form doc)
- [ ] Detailed Description (copy from form doc)
- [ ] Programming Language: "JavaScript (Node.js)"
- [ ] Repository URL: `https://github.com/[YOUR_USERNAME]/antikythera-engine-2`
- [ ] Repository Type: "GitHub"
- [ ] Software Version: "2.0.0"
- [ ] License: "MIT License"
- [ ] Author Name
- [ ] Author Email
- [ ] Author ORCID (if applicable)
- [ ] Keywords (copy from form doc)
- [ ] ADS Subject Keywords (copy from form doc)
- [ ] Dependencies: astronomy-engine v2.1.19, Express.js, Node.js
- [ ] Operating System: "Platform-independent (Node.js)"
- [ ] Additional Notes (copy from form doc)
- [ ] Citation Information: "See CITATION.cff in repository"
- [ ] Documentation URL: Link to GitHub README

### Final Review
- [ ] Double-check all URLs work
- [ ] Verify email address is correct
- [ ] Ensure repository is public
- [ ] Confirm all documentation files are accessible
- [ ] Test API is running and accessible

### Submit
- [ ] Click submit button
- [ ] Save confirmation email
- [ ] Note submission ID/reference number
- [ ] Record submission date: __________________

## Post-Submission

### Immediate Follow-Up (Day 1)
- [ ] Check for confirmation email from ASCL
- [ ] Add submission to calendar for follow-up in 2 weeks
- [ ] Save all submission materials in organized folder

### Week 1-2: Initial Review
- [ ] Monitor email for ASCL editor contact
- [ ] Respond promptly to any questions (within 48 hours)
- [ ] Be prepared to clarify technical details
- [ ] Have validation results ready for reference

### Week 2-3: Technical Review
- [ ] Address any technical questions from reviewers
- [ ] Provide additional documentation if requested
- [ ] Update repository if revisions are needed
- [ ] Communicate clearly with ASCL editors

### Week 3-4: Final Review
- [ ] Make any final requested changes
- [ ] Confirm all reviewer concerns addressed
- [ ] Await formal acceptance notification

### Acceptance
- [ ] Receive ASCL ID (e.g., ascl:YYMM.NNN)
- [ ] Update repository README with ASCL badge
- [ ] Update CITATION.cff with ASCL ID
- [ ] Add ASCL link to project documentation
- [ ] Celebrate! 🎉

```bash
# Add ASCL badge to README.md:
[![ASCL](https://img.shields.io/badge/ascl-YYMM.NNN-blue.svg)](https://ascl.net/YYMM.NNN)
```

## Common Questions Preparation

Be ready to answer:
- [ ] **"Why is this useful to astronomers?"**  
  Answer: Educational value, physical mechanism control, historical astronomy research

- [ ] **"How is this different from existing tools?"**  
  Answer: Simple API for education, validated accuracy, physical control support, open source

- [ ] **"What validation have you performed?"**  
  Answer: NASA HORIZONS comparison, sub-10-arcsecond accuracy, full documentation in VALIDATION.md

- [ ] **"Who is the target audience?"**  
  Answer: Astronomy educators, planetarium operators, museum exhibit designers, researchers

- [ ] **"What are the system requirements?"**  
  Answer: Node.js v14+, minimal dependencies, platform-independent

## Troubleshooting

### If Repository Not Accessible
- [ ] Verify repository is public (not private)
- [ ] Check GitHub Pages if using for documentation
- [ ] Test URLs in incognito browser window

### If Validation Questions Arise
- [ ] Point to `docs/VALIDATION.md`
- [ ] Offer to run validation script live
- [ ] Provide HORIZONS comparison methodology

### If Technical Details Needed
- [ ] Reference `ASCL_submission_detailed.md`
- [ ] Link to astronomy-engine documentation
- [ ] Explain VSOP87/ELP2000 theories used

## Timeline Expectations

| Week | Activity | Your Action |
|------|----------|-------------|
| 0 | Submit | Complete form, submit |
| 1-2 | Initial review | Respond to emails promptly |
| 2-3 | Technical review | Address reviewer questions |
| 3-4 | Final review | Make any requested changes |
| 4+ | Acceptance | Receive ASCL ID |
| 4+ | NASA ADS indexing | Automatic (no action needed) |

## Success Criteria

You'll know you're successful when:
- ✅ You receive an ASCL ID (ascl:YYMM.NNN format)
- ✅ Your software appears in ASCL registry
- ✅ NASA ADS indexes your entry automatically
- ✅ Researchers can cite your software using ASCL ID
- ✅ Software gains visibility in astronomy community

## Important Contacts

**ASCL Website:** https://ascl.net/  
**Submit Page:** https://ascl.net/submit  
**ASCL Guidelines:** https://ascl.net/wordpress/submission-guidelines/  
**ASCL Email:** editors@ascl.net

## Notes Section

Use this space for tracking communications:

**Submission Date:** __________________

**ASCL Reference:** __________________

**Editor Assigned:** __________________

**Questions Asked:**
- _______________________________________
- _______________________________________
- _______________________________________

**Revisions Requested:**
- _______________________________________
- _______________________________________
- _______________________________________

**Acceptance Date:** __________________

**ASCL ID Received:** __________________

**NASA ADS Index Date:** __________________

---

## After Acceptance: Maintenance Checklist

- [ ] Add ASCL badge to README
- [ ] Update CITATION.cff with ASCL ID
- [ ] Announce on social media/blog if desired
- [ ] Add to CV/resume under publications
- [ ] Keep software maintained and updated
- [ ] Update ASCL entry if major changes occur

**Remember:** ASCL registration is a professional accomplishment. Your software is contributing to the astronomy research community! 🌟
