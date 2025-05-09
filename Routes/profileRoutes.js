const express = require('express');
const multer = require('multer');
const db = require('../Config/db'); // Import the database module
const router = express.Router();

// Storage configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// POST endpoint to create a profile
router.post('/profile', upload.fields([
  { name: 'profile_image_url', maxCount: 1 },
  { name: 'adhaar_url', maxCount: 1 },
  { name: 'adhaar_url_back', maxCount: 1 },
]), async (req, res) => {
  const {
    user_id,
    date_of_birth,
    bank_name,
    holder_name,
    account_number,
    ifsc,
    branch,
    bank_city,
    account_type,
    address,
    landmark,
    country,
    state,
    city,
    pincode,
  } = req.body;

  // Handle file uploads
  const profile_image_url = req.files?.profile_image_url?.[0]?.filename || null;
  const adhaar_url = req.files?.adhaar_url?.[0]?.filename || null;
  const adhaar_url_back = req.files?.adhaar_url_back?.[0]?.filename || null;

  try {
    // Prepare data for insertion
    const profileData = {
      user_id,
      date_of_birth,
      profile_image_url,
      adhaar_url,
      adhaar_url_back,
      bank_name,
      holder_name,
      account_number,
      ifsc,
      branch,
      bank_city,
      account_type,
      address,
      landmark,
      country,
      state,
      city,
      pincode,
    };

    // Insert data into the database
    const [result] = await db.query('INSERT INTO user_profiles SET ?', profileData);

    res.status(200).json({ success: true, message: 'Profile saved successfully.' });
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ success: false, message: 'Failed to save profile.' });
  }
});





router.get('/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Query to get the profile data from the database
    const [results] = await db.query('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const profile = results[0];
    return res.status(200).json({
      success: true,
      profile: {
        date_of_birth: profile.date_of_birth || null,
        bank_name: profile.bank_name || null,
        holder_name: profile.holder_name || null,
        account_number: profile.account_number || null,
        ifsc: profile.ifsc || null,
        branch: profile.branch || null,
        bank_city: profile.bank_city || null,
        account_type: profile.account_type || null,
        address: profile.address || null,
        landmark: profile.landmark || null,
        country: profile.country || null,
        state: profile.state || null,
        city: profile.city || null,
        pincode: profile.pincode || null,
        profile_image_url: profile.profile_image_url || null,
        adhaar_url: profile.adhaar_url || null,
        adhaar_url_back: profile.adhaar_url_back || null,
      },
    });
  } catch (error) {
    console.error('Error fetching profile data:', error); // Logs the exact error
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
});







router.put('/update/:user_id', upload.fields([
  { name: 'profile_image_url', maxCount: 1 },
  { name: 'adhaar_url', maxCount: 1 },
  { name: 'adhaar_url_back', maxCount: 1 }
]), async (req, res) => {
  try {
    const user_id = req.params.user_id;

    // Format the date
    const dob = req.body.date_of_birth
      ? new Date(req.body.date_of_birth).toISOString().split("T")[0]
      : null;

    const updatedData = {
      date_of_birth: dob,
      bank_name: req.body.bank_name,
      holder_name: req.body.holder_name,
      account_number: req.body.account_number,
      ifsc: req.body.ifsc,
      branch: req.body.branch,
      bank_city: req.body.bank_city,
      account_type: req.body.account_type,
      address: req.body.address,
      landmark: req.body.landmark,
      country: req.body.country,
      state: req.body.state,
      city: req.body.city,
      pincode: req.body.pincode,
    };

    // Handle optional file uploads
    if (req.files?.profile_image_url) {
      updatedData.profile_image_url = req.files.profile_image_url[0].filename;
    }
    if (req.files?.adhaar_url) {
      updatedData.adhaar_url = req.files.adhaar_url[0].filename;
    }
    if (req.files?.adhaar_url_back) {
      updatedData.adhaar_url_back = req.files.adhaar_url_back[0].filename;
    }

    // ✅ Use `db.query` with promises for async/await
    const [result] = await db.query(
      "UPDATE user_profiles SET ? WHERE user_id = ?",
      [updatedData, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User profile not found." });
    }

    res.json({ message: "Profile updated successfully." });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
});


router.get('/admin/all-aadhaars', async (req, res) => {
  const query = `
    SELECT 
      u.user_id AS user_id,
      u.name,
      up.adhaar_url,
      up.adhaar_url_back,
      up.kyc,
      up.created_at
    FROM user_profiles up
    JOIN users u ON up.user_id = u.user_id
    WHERE 
      up.adhaar_url IS NOT NULL 
      AND up.adhaar_url_back IS NOT NULL
      AND (up.kyc = 'pending' OR up.kyc = 'rejected')
    ORDER BY up.created_at DESC
  `;

  try {
    const [results] = await db.query(query);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching Aadhaar images with user names:', error);
    res.status(500).json({ error: 'Failed to retrieve Aadhaar images.' });
  }
});


router.post('/approve-aadhaar/:userId', async (req, res) => {
  const { userId } = req.params;
  const { kyc } = req.body;

  try {
    const updateQuery = `UPDATE user_profiles SET kyc = ? WHERE user_id = ?`;
    await db.query(updateQuery, [kyc, userId]);
    res.status(200).json({ message: 'KYC status updated successfully' });
  } catch (error) {
    console.error('Error updating KYC status:', error);
    res.status(500).json({ error: 'Error updating KYC status' });
  }
});

// Get KYC status for a specific user
router.get('/kyc-status/:userId', async (req, res) => {
  const { userId } = req.params;

  const sql = 'SELECT kyc FROM user_profiles WHERE user_id = ?';

  try {
    const [result] = await db.query(sql, [userId]);
    console.log('KYC Query Result:', result); // Log the result

    if (result.length === 0) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    res.json({ kycStatus: result[0].kyc });
  } catch (err) {
    console.error('Error fetching KYC status:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});



module.exports = router;
