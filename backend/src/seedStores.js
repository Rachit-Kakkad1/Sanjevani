const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Store = require('./models/store.model');

dotenv.config();

const sampleStores = [
  // Delhi NCR
  {
    name: "PMBJP Jan Aushadhi Kendra - Connaught Place",
    address: "Shop 12, Inner Circle, Connaught Place",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    phone: "011-23456789",
    hours: "08:00 AM - 09:00 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [77.2197, 28.6328] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - AIIMS Campus",
    address: "Opposite Gate No. 2, AIIMS Hospital Complex, Ansari Nagar",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110029",
    phone: "011-98765432",
    hours: "24 Hours Open",
    rating: 4.9,
    location: { type: "Point", coordinates: [77.2100, 28.5672] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Lajpat Nagar",
    address: "B-24, Central Market, Lajpat Nagar II",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110024",
    phone: "011-55443322",
    hours: "09:00 AM - 09:30 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [77.2433, 28.5677] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Rohini Sec 7",
    address: "Pocket G-24, Sector 7, Rohini",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110085",
    phone: "011-11223344",
    hours: "08:30 AM - 08:30 PM",
    rating: 4.6,
    location: { type: "Point", coordinates: [77.1130, 28.7056] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Noida Sec 18",
    address: "Shop 105, Block J, Sector 18",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    phone: "0120-4321890",
    hours: "09:00 AM - 09:00 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [77.3260, 28.5708] }
  },
  // Mumbai
  {
    name: "PMBJP Jan Aushadhi Kendra - Dadar West",
    address: "Shop 4, Near Dadar Railway Station (W)",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400028",
    phone: "022-24109876",
    hours: "08:00 AM - 10:00 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.8427, 19.0178] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Andheri SV Road",
    address: "G-12, Station Complex, SV Road, Andheri (W)",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400058",
    phone: "022-26201234",
    hours: "08:30 AM - 09:30 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [72.8467, 19.1197] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - KEM Hospital Parel",
    address: "Opposite KEM Hospital Main Gate, Parel",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400012",
    phone: "022-24135544",
    hours: "24 Hours Open",
    rating: 4.9,
    location: { type: "Point", coordinates: [72.8424, 19.0028] }
  },
  // Bengaluru
  {
    name: "PMBJP Jan Aushadhi Kendra - Koramangala",
    address: "80 Feet Road, 4th Block, Koramangala",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    phone: "080-25531122",
    hours: "08:00 AM - 09:30 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [77.6245, 12.9349] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Victoria Hospital",
    address: "Victoria Hospital Gate 1, Fort, KR Market",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560002",
    phone: "080-26709988",
    hours: "24 Hours Open",
    rating: 4.9,
    location: { type: "Point", coordinates: [77.5738, 12.9634] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Jayanagar 4th T Block",
    address: "11th Main Rd, 4th T Block East, Jayanagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560041",
    phone: "080-26543322",
    hours: "09:00 AM - 09:00 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [77.5847, 12.9250] }
  },
  // Hyderabad
  {
    name: "PMBJP Jan Aushadhi Kendra - Banjara Hills",
    address: "Road No. 12, Near Government Hospital, Banjara Hills",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500034",
    phone: "040-23348877",
    hours: "08:00 AM - 09:00 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [78.4482, 17.4156] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Osmania General Hospital",
    address: "Main Gate, Osmania Hospital Premises, Afzal Gunj",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500012",
    phone: "040-24601122",
    hours: "24 Hours Open",
    rating: 4.8,
    location: { type: "Point", coordinates: [78.4735, 17.3732] }
  },
  // Chennai
  {
    name: "PMBJP Jan Aushadhi Kendra - T. Nagar",
    address: "Pondy Bazaar, Near Panagal Park, T. Nagar",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600017",
    phone: "044-24345566",
    hours: "08:00 AM - 09:30 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [80.2337, 13.0418] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - RGGH Hospital",
    address: "Opposite Rajiv Gandhi General Hospital, Park Town",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600003",
    phone: "044-25305000",
    hours: "24 Hours Open",
    rating: 4.9,
    location: { type: "Point", coordinates: [80.2785, 13.0815] }
  },
  // Kolkata
  {
    name: "PMBJP Jan Aushadhi Kendra - Park Street",
    address: "75B Park Street, Near Mullick Bazar Crossing",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700016",
    phone: "033-22298877",
    hours: "09:00 AM - 09:00 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [88.3582, 22.5518] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - SSKM Hospital",
    address: "IPGMER & SSKM Hospital Campus, AJC Bose Road",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700020",
    phone: "033-22231515",
    hours: "24 Hours Open",
    rating: 4.9,
    location: { type: "Point", coordinates: [88.3438, 22.5385] }
  },
  // Pune
  {
    name: "PMBJP Jan Aushadhi Kendra - FC Road Shivajinagar",
    address: "Fergusson College Road, Shivajinagar",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411004",
    phone: "020-25534433",
    hours: "08:30 AM - 09:00 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [73.8422, 18.5246] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Sassoon Hospital",
    address: "Near Sassoon Hospital Gate No. 1, Station Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    phone: "020-26128000",
    hours: "24 Hours Open",
    rating: 4.9,
    location: { type: "Point", coordinates: [73.8739, 18.5255] }
  },
  // Ahmedabad
  {
    name: "PMBJP Jan Aushadhi Kendra - Civil Hospital Asarwa",
    address: "Civil Hospital Complex, Asarwa",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380016",
    phone: "079-22683700",
    hours: "24 Hours Open",
    rating: 4.9,
    location: { type: "Point", coordinates: [72.6033, 23.0526] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Navrangpura",
    address: "Near Commerce Six Roads, Navrangpura",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380009",
    phone: "079-26401122",
    hours: "09:00 AM - 09:00 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [72.5562, 23.0368] }
  },
  // Jaipur
  {
    name: "PMBJP Jan Aushadhi Kendra - SMS Hospital",
    address: "SMS Hospital Premises, JLN Marg",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302004",
    phone: "0141-2560291",
    hours: "24 Hours Open",
    rating: 4.9,
    location: { type: "Point", coordinates: [75.8164, 26.8972] }
  },
  // Gujarat - Ahmedabad / Chandkheda (from kendra_21_7_2026 PDF)
  {
    name: "PMBJP Jan Aushadhi Kendra - Plants And Life (PMBJK00505)",
    address: "B 107 Sivudha Commercial & CHSL, IOC Road, Chandkheda",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "382424",
    phone: "079-27500505",
    hours: "08:30 AM - 09:30 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.5852, 23.1118] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Trivedi Prakash (PMBJK03502)",
    address: "Shop 3, C-378, Parasnagar Vibhag-1, Janatanagar, B/H Maniprabhu Prathmik School, Chandkheda",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "382424",
    phone: "079-27503502",
    hours: "08:00 AM - 09:00 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [72.5891, 23.1075] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Joshi Ami Nayankumar (PMBJK11381)",
    address: "Survey No.320, GF.24, Dharti Crystal, I.O.C Road, Chandkheda",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "382424",
    phone: "079-27511381",
    hours: "08:30 AM - 09:00 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.5845, 23.1132] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Kishankumar Chaniyara (PMBJK18858)",
    address: "11/S, Lavnya Park CHSL, Shyam Com., IOC Road, Nr. Pramukhswami Mandir, Chandkheda",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "382424",
    phone: "079-27518858",
    hours: "09:00 AM - 09:30 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [72.5860, 23.1145] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Chandrakanta Bernaila (PMBJK20777)",
    address: "Shop 23, Ground Floor, Shree Sarju Idylluc, Nr. Podar International School, New C G Road, Chandkheda",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "382424",
    phone: "079-27520777",
    hours: "08:30 AM - 09:30 PM",
    rating: 4.9,
    location: { type: "Point", coordinates: [72.5912, 23.1160] }
  },
  // Gujarat - Gandhinagar District (from kendra_21_7_2026 @ 10_19_39 PDF)
  {
    name: "PMBJP Jan Aushadhi Kendra - Vatsalya Complex (PMBJK00560)",
    address: "Shop No 1, Ground Floor, Vatsalya Complex, Opp GEB",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382305",
    phone: "079-23200560",
    hours: "08:30 AM - 09:00 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.6390, 23.2185] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Sunshine Heights Kudasan (PMBJK03851)",
    address: "Shop No.12/GF, Sunshine Heights, Opp. Raysan Petrol Pump, Kudasan",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382421",
    phone: "079-23203851",
    hours: "08:30 AM - 09:30 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [72.6285, 23.1812] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Sector 24 Double Dekker (PMBJK06077)",
    address: "Shop 1, Block 22/237, Double Dekker, Near Gopal Dairy, Sector 24",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382024",
    phone: "079-23206077",
    hours: "08:00 AM - 09:00 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.6610, 23.2450] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Shree Square Pethapur (PMBJK06179)",
    address: "Shop 17/GF, Shree Square, Near Pethapur Cross Road, Pethpur",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382610",
    phone: "079-23206179",
    hours: "08:30 AM - 09:00 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [72.6520, 23.2680] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Sarthak Heaven Kudasan (PMBJK07013)",
    address: "Shop 18, Ground Floor, Sarthak Heaven, Near Rayasan Petrol Pump, Kudasan",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382421",
    phone: "079-23207013",
    hours: "09:00 AM - 09:30 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.6290, 23.1818] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Padmavati Complex Sector 29 (PMBJK09148)",
    address: "Plot 305, Shop G/04, Padmavati Complex, Near GH-6 Circle, Sector 29",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382030",
    phone: "079-23209148",
    hours: "08:30 AM - 09:00 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.6480, 23.2510] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Kalol Three Finger Circle (PMBJK10057)",
    address: "Shop 8, Mil Kamdar Society, Near Three Finger Circle, Kalol",
    city: "Kalol",
    state: "Gujarat",
    pincode: "382721",
    phone: "02764-2510057",
    hours: "08:00 AM - 09:00 PM",
    rating: 4.9,
    location: { type: "Point", coordinates: [72.4990, 23.2360] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - GMERS Civil Hospital (PMBJK11290)",
    address: "GMERS Hospital Campus, C.D.M.O. Cum Civil Surgeon, General Hospital",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "380019",
    phone: "079-23211290",
    hours: "24 Hours Open",
    rating: 4.9,
    location: { type: "Point", coordinates: [72.6360, 23.2170] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - SDH Hospital Mansa (PMBJK11291)",
    address: "Room 14 & 15, SDH Mansa Superintendent, General Hospital, Mansa",
    city: "Mansa",
    state: "Gujarat",
    pincode: "382845",
    phone: "02763-271291",
    hours: "24 Hours Open",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.6590, 23.4285] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - CHC Referral Hospital Adalaj (PMBJK11292)",
    address: "Room 1, Plot 36, CHC Superintendent, Referral and C.H.C., Adalaj",
    city: "Adalaj",
    state: "Gujarat",
    pincode: "382421",
    phone: "079-23211292",
    hours: "24 Hours Open",
    rating: 4.9,
    location: { type: "Point", coordinates: [72.5810, 23.1660] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Rupal Seva Sahkari Mandali (PMBJK14199)",
    address: "Milkat 01, Moti Bhagol, Rupal Seva Sahkari Mandali Ltd, Rupal",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382630",
    phone: "079-23214199",
    hours: "09:00 AM - 09:00 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [72.6350, 23.3250] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Chhatral Chora Pachhal (PMBJK16024)",
    address: "Shop 4, House 732/3, 1st Floor, Chora Pachhal No Vistar, Chhatral",
    city: "Chhatral",
    state: "Gujarat",
    pincode: "382729",
    phone: "02764-266024",
    hours: "08:30 AM - 09:00 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.4490, 23.3105] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Rakhiyal Main Road (PMBJK16173)",
    address: "Property 1214, Rakhiyal Seva Sahkari Mandali Ltd, Main Road, Rakhiyal",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382315",
    phone: "079-23216173",
    hours: "09:00 AM - 08:30 PM",
    rating: 4.6,
    location: { type: "Point", coordinates: [72.8250, 23.1950] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Chiloda Cross Road (PMBJK17529)",
    address: "Milkat 29/16, Chiloda Sewa Sahkari Mandali Ltd, Near ADC Bank, Chiloda",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382355",
    phone: "079-23217529",
    hours: "08:30 AM - 09:00 PM",
    rating: 4.7,
    location: { type: "Point", coordinates: [72.7480, 23.2340] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Mansa Nagarpalika Center (PMBJK21870)",
    address: "Shop 16, Ground Floor, Crossing Nagar Palika Shopping Center, Mansa",
    city: "Mansa",
    state: "Gujarat",
    pincode: "382845",
    phone: "02763-271870",
    hours: "09:00 AM - 09:00 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.6620, 23.4250] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Sahjanand Shine Vavol (PMBJK22574)",
    address: "Shop 1, Sahjanand Shine, Near Guda Water Tank, Vavol",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382016",
    phone: "079-23222574",
    hours: "08:30 AM - 09:30 PM",
    rating: 4.8,
    location: { type: "Point", coordinates: [72.6210, 23.2080] }
  },
  {
    name: "PMBJP Jan Aushadhi Kendra - Pramukh Horizon Unvarsad (PMBJK23454)",
    address: "Shop 09, Pramukh Horizon, Unvarsad",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "382422",
    phone: "079-23223454",
    hours: "08:30 AM - 09:00 PM",
    rating: 4.9,
    location: { type: "Point", coordinates: [72.5650, 23.1890] }
  }
];

// TODO: import store data from CSV
const seedDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medclear');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    await Store.deleteMany({});
    console.log('Existing stores removed');

    await Store.insertMany(sampleStores);
    console.log('Sample stores seeded successfully');

    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
