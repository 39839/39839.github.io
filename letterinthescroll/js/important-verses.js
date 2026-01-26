/**
 * Important Torah Verses - Extremely Significant Verses with Explanations
 * These verses will display a purple asterisk (*) in the top right corner
 * Clicking the asterisk shows why the verse is extremely important
 */

const IMPORTANT_VERSES = {
  "Genesis 1:1": {
    hebrew_start: "Bereshit bara...",
    explanation: "The foundational verse establishing God as Creator. It marks the very beginning of the Torah and the universe."
  },
  "Genesis 1:31": {
    hebrew_start: "Vayachal Elohim...",
    explanation: "These verses form the text of the 'Vayechulu' prayer recited every Friday night during Kiddush, sanctifying the Sabbath."
  },
  "Genesis 2:1": {
    hebrew_start: "Vayachal Elohim...",
    explanation: "These verses form the text of the 'Vayechulu' prayer recited every Friday night during Kiddush, sanctifying the Sabbath."
  },
  "Genesis 2:2": {
    hebrew_start: "Vayachal Elohim...",
    explanation: "These verses form the text of the 'Vayechulu' prayer recited every Friday night during Kiddush, sanctifying the Sabbath."
  },
  "Genesis 2:3": {
    hebrew_start: "Vayachal Elohim...",
    explanation: "These verses form the text of the 'Vayechulu' prayer recited every Friday night during Kiddush, sanctifying the Sabbath."
  },
  "Genesis 12:1": {
    hebrew_start: "Vayomer Adonai el-Avram...",
    explanation: "Known as 'Lech Lecha,' this is the calling of Abraham and the start of the Jewish people's unique journey."
  },
  "Genesis 18:1": {
    hebrew_start: "Vayera eilav...",
    explanation: "This verse is used as the source for the mitzvah of 'Hachnasat Orchim' (hospitality), as Abraham greets guests while God is visiting him."
  },
  "Exodus 3:14": {
    hebrew_start: "Ehyeh asher ehyeh...",
    explanation: "The revelation of God's name to Moses at the burning bush, meaning 'I will be what I will be,' signifying eternal presence."
  },
  "Exodus 15:1": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:2": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:3": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:4": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:5": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:6": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:7": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:8": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:9": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:10": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:11": {
    hebrew_start: "Mi chamocha ba'eilim...",
    explanation: "A central part of the liturgy recited before the Amidah, asking 'Who is like You among the mighty, O Lord?'"
  },
  "Exodus 15:12": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:13": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:14": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:15": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:16": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:17": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:18": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 20:2": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:3": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:4": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:5": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:6": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:7": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:8": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:9": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:10": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:11": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:12": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:13": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:14": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 34:6": {
    hebrew_start: "Adonai, Adonai, El rachum...",
    explanation: "The Thirteen Attributes of Mercy. These are the most important verses recited during Selichot and on the High Holidays (Yom Kippur)."
  },
  "Exodus 34:7": {
    hebrew_start: "Adonai, Adonai, El rachum...",
    explanation: "The Thirteen Attributes of Mercy. These are the most important verses recited during Selichot and on the High Holidays (Yom Kippur)."
  },
  "Leviticus 19:2": {
    hebrew_start: "Kedoshim tihyu...",
    explanation: "The command to 'be holy,' serving as the moral objective for the entire nation."
  },
  "Leviticus 19:18": {
    hebrew_start: "V'ahavta l'rei-acha kamocha...",
    explanation: "Love your neighbor as yourself. This is the 'Golden Rule' of the Torah and the basis for all interpersonal ethics."
  },
  "Numbers 6:24": {
    hebrew_start: "Yivarechecha Adonai...",
    explanation: "The Priestly Blessing. It is used by parents to bless children and by priests during the synagogue service."
  },
  "Numbers 6:25": {
    hebrew_start: "Yivarechecha Adonai...",
    explanation: "The Priestly Blessing. It is used by parents to bless children and by priests during the synagogue service."
  },
  "Numbers 6:26": {
    hebrew_start: "Yivarechecha Adonai...",
    explanation: "The Priestly Blessing. It is used by parents to bless children and by priests during the synagogue service."
  },
  "Numbers 10:35": {
    hebrew_start: "Vayehi binsoa ha-aron...",
    explanation: "These verses are sung every single time the Torah Ark is opened and closed in the synagogue."
  },
  "Numbers 10:36": {
    hebrew_start: "Vayehi binsoa ha-aron...",
    explanation: "These verses are sung every single time the Torah Ark is opened and closed in the synagogue."
  },
  "Numbers 15:37": {
    hebrew_start: "Vayomer Adonai... V'asu lahem tzitzit...",
    explanation: "The third paragraph of the Shema. It contains the commandment for Tzitzit and the daily remembrance of the Exodus from Egypt."
  },
  "Numbers 15:38": {
    hebrew_start: "Vayomer Adonai... V'asu lahem tzitzit...",
    explanation: "The third paragraph of the Shema. It contains the commandment for Tzitzit and the daily remembrance of the Exodus from Egypt."
  },
  "Numbers 15:39": {
    hebrew_start: "Vayomer Adonai... V'asu lahem tzitzit...",
    explanation: "The third paragraph of the Shema. It contains the commandment for Tzitzit and the daily remembrance of the Exodus from Egypt."
  },
  "Numbers 15:40": {
    hebrew_start: "Vayomer Adonai... V'asu lahem tzitzit...",
    explanation: "The third paragraph of the Shema. It contains the commandment for Tzitzit and the daily remembrance of the Exodus from Egypt."
  },
  "Numbers 15:41": {
    hebrew_start: "Vayomer Adonai... V'asu lahem tzitzit...",
    explanation: "The third paragraph of the Shema. It contains the commandment for Tzitzit and the daily remembrance of the Exodus from Egypt."
  },
  "Numbers 24:5": {
    hebrew_start: "Mah tovu ohaleycha...",
    explanation: "Balaam's blessing. It is the very first verse recited upon entering a synagogue in the morning."
  },
  "Deuteronomy 6:4": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 6:5": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 6:6": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 6:7": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 6:8": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 6:9": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 8:10": {
    hebrew_start: "V'achalta v'savata...",
    explanation: "The biblical source for 'Birkat HaMazon' (Grace After Meals): 'And you shall eat and be satisfied and bless the Lord your God.'"
  },
  "Deuteronomy 11:13": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:14": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:15": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:16": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:17": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:18": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:19": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:20": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:21": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 16:20": {
    hebrew_start: "Tzedek tzedek tirdof...",
    explanation: "The absolute mandate to pursue justice, emphasizing that the search for righteousness must be active and tireless."
  },
  "Deuteronomy 30:19": {
    hebrew_start: "U-vacharta ba-chayim...",
    explanation: "The final plea from Moses to 'choose life,' cementing the concept of human free will as a core theological pillar."
  },
  "Deuteronomy 33:4": {
    hebrew_start: "Torah tziva lanu Moshe...",
    explanation: "A verse often taught to children as their first introduction to Torah: 'The Torah that Moses commanded us is the heritage of the congregation of Jacob.'"
  }
};

/**
 * Check if a verse is marked as important
 * @param {string} verseRef - The verse reference (e.g., "Genesis 1:1")
 * @returns {boolean} - True if the verse is important
 */
export function isImportantVerse(verseRef) {
  return verseRef in IMPORTANT_VERSES;
}

/**
 * Get the explanation for an important verse
 * @param {string} verseRef - The verse reference (e.g., "Genesis 1:1")
 * @returns {object|null} - The verse data or null if not important
 */
export function getImportantVerseData(verseRef) {
  return IMPORTANT_VERSES[verseRef] || null;
}

export { IMPORTANT_VERSES };
