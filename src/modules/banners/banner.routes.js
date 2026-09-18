const { Router } = require('express');
const { Banner } = require('../../models/Banner');

const router = Router();

// Public endpoint for mobile/website to fetch active banners
router.get('/', async (req, res) => {
  try {
    const { platform } = req.query;
    const query = { isActive: true };

    if (platform && platform !== 'all') {
      query.targetPlatform = { $in: [platform, 'all'] };
    }

    const banners = await Banner.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    res.json({ success: true, banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
