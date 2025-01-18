export class VideoParser {
  constructor() {
    this.patterns = {
      channel1: {
        date: /(\d{1,2}\s+(?:stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)\s+\d{4}|\d{2}\.\d{2}\.\d{4})/i,
        tvChannel: /(TVP\d|TVP\sInfo|TVP\sKultura|Polsat|TVN)/i,
        elements: {
          reklama: /reklamy|blok\sreklamowy/i,
          zapowiedz: /zapowied(?:ź|z)/i,
          spot: /spot/i,
          konkurs: /konkurs|teleaudio|audiotele/i,
          ident: /ident/i,
          pauza: /pauza/i,
          zakonczenie: /zakoń?czeni[ae]|koniec/i,
          rozpoczecie: /rozpocz(?:ę|e)ci[ae]/i,
          wpadka: /wpadka|fail/i,
          belka: /belka|pasek/i,
          studio: /studio/i,
          plansza: /plansza/i
        }
      }
    };

    this.months = {
      'stycznia': '01',
      'lutego': '02',
      'marca': '03',
      'kwietnia': '04',
      'maja': '05',
      'czerwca': '06',
      'lipca': '07',
      'sierpnia': '08',
      'września': '09',
      'października': '10',
      'listopada': '11',
      'grudnia': '12'
    };

    this.defaultDatePattern = /(\d{1,2}\s+(?:stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)\s+\d{4}|\d{2}\.\d{2}\.\d{4})/i;
  }

  parseTitle(title, channelId, customDatePattern, channelMappings = [], extractChannelFromTitle = false) {
    let pattern = this.patterns[channelId] || this.patterns.channel1;
    
    if (customDatePattern) {
      pattern = {
        ...pattern,
        date: new RegExp(customDatePattern)
      };
    }

    const parsed = {
      title,
      date: this.extractDate(title, pattern),
      tvChannel: this.extractTvChannel(title, pattern, channelMappings, extractChannelFromTitle),
      elements: this.extractElements(title, pattern)
    };

    return parsed;
  }

  extractDate(title, pattern) {
    const match = title.match(pattern.date || this.defaultDatePattern);
    if (!match) return null;

    const dateStr = match[1];
    
    // Check if date is already in DD.MM.YYYY format
    if (dateStr.includes('.')) {
      return dateStr;
    }

    // Convert text date to DD.MM.YYYY format
    const parts = dateStr.toLowerCase().split(/\s+/);
    if (parts.length !== 3) return null;

    let [day, month, year] = parts;
    
    // Pad day with leading zero if necessary
    day = day.padStart(2, '0');
    
    // Convert month name to number
    const monthNum = this.months[month];
    if (!monthNum) return null;

    return `${day}.${monthNum}.${year}`;
  }

  extractTvChannel(title, pattern, channelMappings, extractChannelFromTitle) {
    // First try custom mappings
    for (const mapping of channelMappings) {
      if (title.toLowerCase().includes(mapping.from.toLowerCase())) {
        return mapping.to;
      }
    }

    // Then try extracting from title before "-" if enabled
    if (extractChannelFromTitle) {
      const beforeDash = title.split('-')[0].trim();
      if (beforeDash) {
        return beforeDash;
      }
    } else {
      // If not extracting from title, check for existing channels in database
      try {
        const existingVideos = JSON.parse(localStorage.getItem('videos') || '[]');
        const existingChannels = [...new Set(existingVideos
          .map(video => video.parsed.tvChannel)
          .filter(channel => channel)
        )];
        
        // Check if any existing channel name appears in the title
        for (const channel of existingChannels) {
          if (title.toLowerCase().includes(channel.toLowerCase())) {
            return channel;
          }
        }
      } catch (error) {
        console.error('Error checking existing channels:', error);
      }
    }

    // Finally, try the default pattern
    const match = title.match(pattern.tvChannel);
    return match ? match[1] : null;
  }

  extractElements(title, pattern) {
    const elements = [];
    for (const [element, regex] of Object.entries(pattern.elements)) {
      if (regex.test(title)) {
        elements.push(element);
      }
    }
    return elements;
  }
}