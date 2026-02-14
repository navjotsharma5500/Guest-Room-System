// backend/models/SocietyNameSuggestion.js
import mongoose from 'mongoose';

export const DEFAULT_SOCIETY_NAMES = [
  "SATURNALIA",
  "THAPAR FOOD FESTIVAL",
  "FROSH",
  "THAPAR SPORTS",
  "Creative Computing Society",
  "Developer Student Club",
  "ACM Computing Chapter",
  "Microsoft Learn Student Chapter",
  "OWASP Student Chapter",
  "Linux User Group - TIET",
  "Music and Dramatic Society (MUDRA) & SUR",
  "Spiritual Scientists' Alliance (SSA)",
  "SPIC MACAY",
  "Literary Society",
  "NATIONAL SERVICES SCHEME",
  "Ek Bharat Shreshtha Bharat Club",
  "Gender Champions Club",
  "TIET Fitness Club",
  "Youth United - Thapar Chapter",
  "ROTARACT CLUB - TIET",
  "GENE",
  "GirlUpTIET Society",
  "Pratigya Society",
  "Paryawaran Welfare Society (PWS)",
  "Electoral Club",
  "Energy Conservation Club (ECC)",
  "Thapar Venture Club (TVC)",
  "Economics Club (ECON CLUB)",
  "Thapar Institute Counselling Cell (TICC)",
  "LEAD SOCIETY",
  "Thapar Model United Nations (TUMUN)",
  "Thapar Mathematical Society (TMS)",
  "International Association of Students In Economics & Business Management (AIESEC)",
  "Bureau of Indian Standards (BIS)",
  "TEDx",
  "Adventure Club",
  "Dance Club 'NOX'",
  "Echoes Club",
  "Thapar Movie Club (TMC)",
  "TU Toastmasters Club",
  "Elpis, the psychology society",
  "ENACTUS",
  "Fine Arts and Photography Society (FAPS)",
  "Institution's Innovation Council (IIC)",
  "SAE Collegiate Club of TIET",
  "Team Oorja",
  "Society of Intelligent Systems (SIS)",
  "Society for Community Engineering (SCE)",
  "Society of Mechanical and Industrial Engineers (SOMIE)",
  "Materials and Physics Society (MAPS)",
  "Mechatronics and Robotics Society (MARS)",
  "Thapar Amateur Astronomers Society (TAAS)",
  "Thapar Society of Civil Engineers (TSCE)",
  "Institution of Engineers(India) - Student Chapter (IEI)",
  "Indian Institute Of Chemical Engineers (IICHE)",
  "Indian Society of Technical Education (ISTE)",
  "Institution of Electronics And Telecommunication Engineers (IETE)",
  "Chemist's Association for Research and Education Society",
  "AICHE Student Chapter",
  "EUREKA Prize Problems",
  "American Society of Heating Refrigeration and Air-Conditioning Engineers (ASHRAE)",
];

export const DEFAULT_SOCIETY_EMAILS = {
  "Creative Computing Society": "ccs@thapar.edu",
  "Developer Student Club": "google.dsctiet@thapar.edu",
  "ACM Computing Chapter": "acmcomputingchapter@thapar.edu",
  "Microsoft Learn Student Chapter": "msc@thapar.edu",
  "OWASP Student Chapter": "owasp_sc@thapar.edu",
  "Linux User Group - TIET": "lugtu@thapar.edu",
  "Music and Dramatic Society (MUDRA) & SUR": "mudra@thapar.edu",
  "Spiritual Scientists' Alliance (SSA)": "ssa@thapar.edu",
  "SPIC MACAY": "spicmacay@thapar.edu",
  "Literary Society": "litsoc@thapar.edu",
  "Ek Bharat Shreshtha Bharat Club": "ebsb@thapar.edu",
  "Gender Champions Club": "gcc@thapar.edu",
  "TIET Fitness Club": "tietfitnessclub@thapar.edu",
  "Youth United - Thapar Chapter": "yu@thapar.edu",
  "ROTARACT CLUB - TIET": "rotaractclub_sc@thapar.edu",
  "GENE": "gene@thapar.edu",
  "GirlUpTIET Society": "girlup@thapar.edu",
  "Pratigya Society": "pratigyasoc@thapar.edu",
  "Paryawaran Welfare Society (PWS)": "pws@thapar.edu",
  "Electoral Club": "electoralclubthapar@gmail.com",
  "Thapar Mathematical Society (TMS)": "mathematical_soc@thapar.edu",
  "Institution's Innovation Council (IIC)": "iic-tiet@thapar.edu",
  "SAE Collegiate Club of TIET": "team.fateh@thapar.edu",
  "Team Oorja": "team_oorja@thapar.edu",
  "Society of Intelligent Systems (SIS)": "sis@thapar.edu",
  "Society for Community Engineering (SCE)": "sce@thapar.edu",
  "Society of Mechanical and Industrial Engineers (SOMIE)": "somie@thapar.edu",
  "Materials and Physics Society (MAPS)": "maps@thapar.edu",
  "Mechatronics and Robotics Society (MARS)": "robotics@thapar.edu",
  "Thapar Amateur Astronomers Society (TAAS)": "taas.astronomers@thapar.edu",
  "Thapar Society of Civil Engineers (TSCE)": "tsce@thapar.edu",
  "Institution of Engineers(India) - Student Chapter (IEI)": "iei_sc@thapar.edu",
  "Indian Institute Of Chemical Engineers (IICHE)": "iiche@thapar.edu",
  "Indian Society of Technical Education (ISTE)": "iste@thapar.edu",
  "Institution of Electronics And Telecommunication Engineers (IETE)": "iete_sc@thapar.edu",
  "Chemist's Association for Research and Education Society": "score@thapar.edu",
  "American Society of Heating Refrigeration and Air-Conditioning Engineers (ASHRAE)": "ashrae_sc@thapar.edu",
};

const normalizeName = (value = "") => String(value || "").trim().toLowerCase();

const DEFAULT_SOCIETY_EMAILS_BY_NAME = Object.entries(DEFAULT_SOCIETY_EMAILS).reduce(
  (acc, [name, email]) => {
    acc[normalizeName(name)] = String(email || "").trim().toLowerCase();
    return acc;
  },
  {}
);

export const getDefaultSocietyEmail = (name = "") =>
  DEFAULT_SOCIETY_EMAILS_BY_NAME[normalizeName(name)] || "";

const societyNameSuggestionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  email: {
    type: String,
    trim: true,
    default: "",
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

societyNameSuggestionSchema.index({ name: 'text' });

const SocietyNameSuggestion = mongoose.models.SocietyNameSuggestion
  || mongoose.model('SocietyNameSuggestion', societyNameSuggestionSchema);

export const seedDefaultSocietySuggestions = async () => {
  if (!Array.isArray(DEFAULT_SOCIETY_NAMES) || DEFAULT_SOCIETY_NAMES.length === 0) return;

  const now = new Date();

  const operations = DEFAULT_SOCIETY_NAMES.map((name) => {
    const email = getDefaultSocietyEmail(name);

    return {
      updateOne: {
        filter: { name },
        update: {
          $setOnInsert: {
            name,
            usageCount: 0,
            lastUsed: now,
            email: email || "",
          },
        },
        upsert: true,
      },
    };
  });

  await SocietyNameSuggestion.bulkWrite(operations, { ordered: false });
};


export default SocietyNameSuggestion;
