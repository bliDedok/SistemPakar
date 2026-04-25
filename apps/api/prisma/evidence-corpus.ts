export const evidenceCorpus = [
  {
    diseaseCode: "P004",
    title: "Dengue warning signs",
    sourceName: "WHO and CDC",
    sourceType: "guideline",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue",
    evidenceDoi: null,
    symptomCodes: ["G014", "G013", "G016", "G017", "G018", "G019"],
    content:
      "Dengue dapat berkembang menjadi kondisi berat. Tanda bahaya meliputi nyeri perut berat, muntah persisten, perdarahan dari hidung atau gusi, letargi, gelisah, lemah, haus berlebihan, serta kulit pucat dan dingin. Jika tanda bahaya muncul, anak perlu segera mendapatkan pemeriksaan medis.",
  },
  {
    diseaseCode: "P006",
    title: "Pneumonia signs in children",
    sourceName: "WHO",
    sourceType: "guideline",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/pneumonia",
    evidenceDoi: null,
    symptomCodes: ["G003", "G001", "G021", "G022", "G023"],
    content:
      "Pada anak, pneumonia sering dicurigai bila terdapat batuk atau sulit bernapas, dengan atau tanpa demam. Tanda penting yang perlu diperhatikan adalah napas cepat dan tarikan dinding dada bagian bawah saat bernapas.",
  },
  {
    diseaseCode: "P003",
    title: "Influenza symptoms and emergency warning signs in children",
    sourceName: "CDC",
    sourceType: "guideline",
    sourceUrl: "https://www.cdc.gov/flu/signs-symptoms/index.html",
    evidenceDoi: null,
    symptomCodes: ["G001", "G003", "G004", "G005", "G006", "G007", "G012", "G025"],
    content:
      "Influenza pada anak dapat menyebabkan demam, batuk, sakit tenggorokan, pilek, nyeri tubuh, sakit kepala, menggigil, dan kelelahan. Pada sebagian anak dapat muncul muntah atau diare. Tanda bahaya meliputi napas cepat, sulit bernapas, dehidrasi, tidak responsif, kejang, atau demam tinggi.",
  },
  {
    diseaseCode: "P005",
    title: "Acute diarrhea and dehydration risk",
    sourceName: "WHO and CDC",
    sourceType: "guideline",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
    evidenceDoi: null,
    symptomCodes: ["G025", "G012", "G011", "G014", "G024", "G026"],
    content:
      "Diare akut pada anak dapat menyebabkan kehilangan cairan dan elektrolit. Risiko utama adalah dehidrasi, terutama bila disertai muntah, tidak mau minum, lemas, atau asupan cairan berkurang. Rehidrasi oral bertahap dapat membantu, namun tanda dehidrasi berat memerlukan pemeriksaan medis.",
  },
  {
    diseaseCode: "P014",
    title: "Malaria symptoms and severe signs",
    sourceName: "WHO and CDC",
    sourceType: "guideline",
    sourceUrl: "https://www.cdc.gov/malaria/symptoms/index.html",
    evidenceDoi: null,
    symptomCodes: ["G001", "G039", "G006", "G007", "G025", "G040", "G041", "G044", "G045"],
    content:
      "Malaria dapat menimbulkan demam, menggigil, sakit kepala, nyeri otot, kelelahan, mual, muntah, atau diare. Riwayat perjalanan ke daerah endemis penting sebagai faktor konteks. Gejala berat dapat meliputi gangguan kesadaran, kejang, syok, jaundice, atau kesulitan bernapas.",
  },
  {
    diseaseCode: "P001",
    title: "Pinworm infection symptoms",
    sourceName: "CDC",
    sourceType: "guideline",
    sourceUrl: "https://www.cdc.gov/pinworm/about/index.html",
    evidenceDoi: null,
    symptomCodes: ["G033", "G034", "G035", "G036", "G037"],
    content:
      "Infeksi pinworm sering terjadi pada anak. Gejala khasnya adalah gatal di sekitar anus, terutama pada malam hari. Cacing kadang dapat terlihat di sekitar anus atau pakaian tidur beberapa jam setelah anak tertidur.",
  },
  {
    diseaseCode: "P010",
    title: "Roseola fever and rash pattern",
    sourceName: "Mayo Clinic / NCBI",
    sourceType: "clinical_reference",
    sourceUrl: "https://www.ncbi.nlm.nih.gov/books/NBK448190/",
    evidenceDoi: null,
    symptomCodes: ["G029", "G030", "G010", "G031", "G032"],
    content:
      "Roseola umumnya terjadi pada bayi dan anak kecil. Pola khasnya adalah demam tinggi selama beberapa hari, kemudian muncul ruam saat demam mulai turun. Sebagian anak dapat mengalami rewel, penurunan nafsu makan, atau kejang demam.",
  },
  {
    diseaseCode: "P013",
    title: "Acute otitis media symptoms",
    sourceName: "AAP / NCBI",
    sourceType: "clinical_reference",
    sourceUrl: "https://www.ncbi.nlm.nih.gov/books/NBK470332/",
    evidenceDoi: null,
    symptomCodes: ["G027", "G028", "G001", "G037"],
    content:
      "Otitis media akut pada anak sering ditandai dengan nyeri telinga. Pada anak kecil, gejalanya dapat berupa rewel, gangguan tidur, nafsu makan menurun, demam, atau cairan yang keluar dari telinga.",
  },
] as const;