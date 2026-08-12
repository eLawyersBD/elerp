// Bangladesh Geographical Database (Divisions, Districts, Upazilas, and Post Codes)

export const DIVISIONS = [
  'Barishal',
  'Chattogram',
  'Dhaka',
  'Khulna',
  'Mymensingh',
  'Rajshahi',
  'Rangpur',
  'Sylhet'
];

export const DISTRICTS = {
  'Barishal': ['Barishal', 'Barguna', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
  'Chattogram': ['Chattogram', 'Cox\'s Bazar', 'Bandarban', 'Brahmanbaria', 'Chandpur', 'Cumilla', 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati'],
  'Dhaka': ['Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail'],
  'Khulna': ['Khulna', 'Bagerhat', 'Chuadanga', 'Jessore', 'Jhenaidah', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  'Mymensingh': ['Mymensingh', 'Netrokona', 'Sherpur', 'Jamalpur'],
  'Rajshahi': ['Rajshahi', 'Bogura', 'Joypurhat', 'Naogaon', 'Natore', 'Nawabganj', 'Pabna', 'Sirajganj'],
  'Rangpur': ['Rangpur', 'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Thakurgaon'],
  'Sylhet': ['Sylhet', 'Habiganj', 'Moulvibazar', 'Sunamganj']
};

export const UPAZILAS = {
  // Dhaka District
  'Dhaka': ['Banani', 'Gulshan', 'Dhanmondi', 'Mirpur', 'Uttara', 'Savar', 'Dhamrai', 'Keraniganj', 'Tejgaon', 'Motijheel', 'Ramna', 'Badda', 'Khilgaon', 'Paltan', 'Shahbagh'],
  'Gazipur': ['Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur'],
  'Narayanganj': ['Narayanganj Sadar', 'Araihazar', 'Bandar', 'Rupganj', 'Sonargaon'],
  
  // Chattogram District
  'Chattogram': ['Panchlaish', 'Double Mooring', 'Kotwali', 'Hathazari', 'Sandwip', 'Raozan', 'Fatikchhari', 'Patiya', 'Sitakunda', 'Anwara', 'Mirsharai', 'Boalkhali'],
  'Cox\'s Bazar': ['Cox\'s Bazar Sadar', 'Chakaria', 'Maheshkhali', 'Ramu', 'Teknaf', 'Ukhia', 'Pekua'],
  
  // Khulna District
  'Khulna': ['Khulna Sadar', 'Daulatpur', 'Khalishpur', 'Sonadanga', 'Rupsha', 'Phultala', 'Dacope', 'Dighalia', 'Dumuria', 'Batiaghata'],
  
  // Sylhet District
  'Sylhet': ['Sylhet Sadar', 'Beanibazar', 'Golapganj', 'Fenchuganj', 'Balaganj', 'Biswanath', 'Companiganj', 'Gowainghat', 'Jaintiapur', 'Zakiganj'],
  
  // Rajshahi District
  'Rajshahi': ['Boalia', 'Rajput', 'Paba', 'Godagari', 'Bagha', 'Charghat', 'Durgapur', 'Mohanpur', 'Tanore'],
  'Bogura': ['Bogura Sadar', 'Adamdighi', 'Dhunat', 'Dupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Sherpur', 'Shibganj'],
  
  // Barishal District
  'Barishal': ['Barishal Sadar', 'Babuganj', 'Bakerganj', 'Banaripara', 'Gournadi', 'Muladi', 'Hizla', 'Mehendiganj', 'Wazirpur'],
  
  // Rangpur District
  'Rangpur': ['Rangpur Sadar', 'Mithapukur', 'Pirganj', 'Badarganj', 'Gangachhara', 'Kaunia', 'Taraganj', 'Pirgachha'],
  
  // Mymensingh District
  'Mymensingh': ['Mymensingh Sadar', 'Muktagachha', 'Bhaluka', 'Trishal', 'Gaffargaon', 'Ishwarganj', 'Haluaghat', 'Fulbaria', 'Nandail']
};

export const POST_CODES = {
  // Dhaka Upazilas
  'Banani': ['1213'],
  'Gulshan': ['1212'],
  'Dhanmondi': ['1209'],
  'Mirpur': ['1216', '1218'],
  'Uttara': ['1230'],
  'Savar': ['1340', '1341', '1342', '1344'],
  'Keraniganj': ['1310', '1311', '1312'],
  'Tejgaon': ['1208', '1215'],
  'Motijheel': ['1000', '1223'],
  'Ramna': ['1217'],
  'Badda': ['1212'],
  'Khilgaon': ['1219'],
  'Paltan': ['1000'],
  'Shahbagh': ['1000'],

  // Gazipur
  'Gazipur Sadar': ['1700', '1701', '1702'],
  'Sreepur': ['1740'],
  
  // Narayanganj
  'Narayanganj Sadar': ['1400', '1410'],
  'Sonargaon': ['1440'],

  // Chattogram Upazilas
  'Panchlaish': ['4203'],
  'Double Mooring': ['4202'],
  'Kotwali': ['4000'],
  'Hathazari': ['4330'],
  'Sitakunda': ['4310'],

  // Khulna Upazilas
  'Khulna Sadar': ['9100'],
  'Khalishpur': ['9000'],
  
  // Sylhet
  'Sylhet Sadar': ['3100'],
  
  // Rajshahi
  'Boalia': ['6000'],
  'Bogura Sadar': ['5800'],
  
  // Barishal
  'Barishal Sadar': ['8200'],
  
  // Rangpur
  'Rangpur Sadar': ['5400'],
  
  // Mymensingh
  'Mymensingh Sadar': ['2200'],
  'Bhaluka': ['2240']
};

// Returns districts for a given division, defaulting to first division's if invalid
export function getDistrictsForDivision(division) {
  return DISTRICTS[division] || DISTRICTS['Dhaka'];
}

// Returns upazilas for a district. Generates default list if district is not hardcoded
export function getUpazilasForDistrict(district) {
  if (UPAZILAS[district]) {
    return UPAZILAS[district];
  }
  // Safe dynamic fallback for other districts
  return [`${district} Sadar`, 'Bazar Area', 'Sadar Upazila'];
}

// Returns post codes for upazila. Generates default post codes if not hardcoded
export function getPostCodesForUpazila(upazila) {
  if (POST_CODES[upazila]) {
    return POST_CODES[upazila];
  }
  // Safe dynamic fallback post codes based on upazila name length
  const hash = upazila.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const code = 1000 + (hash % 8000); // Generate a 4-digit code
  return [code.toString(), (code + 1).toString()];
}

/**
 * Parses a concatenated address string back into structured dropdown selections
 * 
 * @param {string} addressStr - Format: "Street, Upazila, District, Division - Postcode"
 * @returns {Object} Structured address components
 */
export function parseAddressString(addressStr) {
  const defaultResult = {
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Banani',
    postCode: '1213',
    street: addressStr || ''
  };

  if (!addressStr || typeof addressStr !== 'string') {
    return defaultResult;
  }

  // Split by commas
  const parts = addressStr.split(',').map(p => p.trim());
  if (parts.length < 3) {
    // If it's a short string, try checking if it contains division or district names
    const foundDiv = DIVISIONS.find(d => addressStr.toLowerCase().includes(d.toLowerCase()));
    if (foundDiv) {
      const districts = DISTRICTS[foundDiv];
      const foundDist = districts.find(ds => addressStr.toLowerCase().includes(ds.toLowerCase()));
      return {
        division: foundDiv,
        district: foundDist || districts[0],
        upazila: getUpazilasForDistrict(foundDist || districts[0])[0],
        postCode: getPostCodesForUpazila(getUpazilasForDistrict(foundDist || districts[0])[0])[0],
        street: addressStr
      };
    }
    return { ...defaultResult, street: addressStr };
  }

  try {
    const lastPart = parts[parts.length - 1]; // e.g. "Dhaka - 1213" or "1213"
    let postCode = '';
    let division = '';
    let district = '';
    let upazila = '';

    // 1. Extract Post Code (4 digits)
    const postMatch = addressStr.match(/\b\d{4}\b/);
    if (postMatch) {
      postCode = postMatch[0];
    }

    // 2. Identify Division
    // Check if the last part (excluding post code) is a division
    const cleanLast = lastPart.replace(postCode, '').replace(/[-\s]/g, '').trim();
    
    // Find matching division in the last two segments
    const foundDivision = DIVISIONS.find(div => 
      cleanLast.toLowerCase() === div.toLowerCase() ||
      (parts[parts.length - 2] && parts[parts.length - 2].toLowerCase() === div.toLowerCase())
    );

    division = foundDivision || 'Dhaka';

    // 3. Identify District
    const districts = getDistrictsForDivision(division);
    // Look at last few parts
    const foundDistrict = districts.find(dist => 
      parts.some(p => p.toLowerCase().replace(/[-\s]/g, '') === dist.toLowerCase().replace(/[-\s]/g, ''))
    );

    district = foundDistrict || districts[0];

    // 4. Identify Upazila
    const upazilas = getUpazilasForDistrict(district);
    const foundUpazila = upazilas.find(up => 
      parts.some(p => p.toLowerCase() === up.toLowerCase())
    );

    upazila = foundUpazila || upazilas[0];

    // 5. Default post code if none found
    if (!postCode) {
      postCode = getPostCodesForUpazila(upazila)[0];
    }

    // 6. Extract Street (remaining parts at the front)
    // Find index of upazila or district to slice
    let limitIndex = parts.findIndex(p => p.toLowerCase() === upazila.toLowerCase());
    if (limitIndex === -1) {
      limitIndex = parts.findIndex(p => p.toLowerCase() === district.toLowerCase());
    }
    if (limitIndex <= 0) {
      limitIndex = parts.length - 3;
      if (limitIndex < 1) limitIndex = 1;
    }

    const street = parts.slice(0, limitIndex).join(', ') || parts[0];

    return { division, district, upazila, postCode, street };
  } catch (error) {
    console.error("Address parsing error:", error);
    return { ...defaultResult, street: addressStr };
  }
}
