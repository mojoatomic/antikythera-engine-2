class LanguageManager {
  constructor() {
    this.languages = null;
    this.currentLanguage = 'english';
  }
  
  async load() {
    try {
      // Load translations
      const langResponse = await fetch('/config/languages.json');
      this.languages = await langResponse.json();
      console.log('Translations loaded:', Object.keys(this.languages));
      
      // Load language setting from server (.env.local)
      const settingResponse = await fetch('/api/language');
      const setting = await settingResponse.json();
      this.currentLanguage = setting.language || 'english';
      
      console.log(`✅ Language set to: ${this.currentLanguage}`);
      console.log(`Sample translation (title): ${this.t('front_face.title')}`);
      console.log(`Sample zodiac (Aries): ${this.getZodiacName(0)}`);
    } catch (err) {
      console.error('❌ Failed to load language:', err);
      this.currentLanguage = 'english';
    }
  }
  
  t(key) {
    if (!this.languages) return key;
    const lang = this.languages[this.currentLanguage];
    if (!lang) return key;
    
    const keys = key.split('.');
    let value = lang;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    return value;
  }
  
  getZodiacName(index) {
    const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                   'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    return this.t(`zodiac.${signs[index]}`);
  }
  
  getMonthName(index) {
    return this.t(`months.${index}`);
  }
}

// eslint-disable-next-line no-unused-vars
const languageManager = new LanguageManager();
