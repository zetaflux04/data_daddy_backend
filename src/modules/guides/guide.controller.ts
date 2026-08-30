import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { RepairGuide } from '../../models/RepairGuide';
import { Shop } from '../../models/Shop';
// Cloudinary integration (Replaced AWS S3 - AWS temporarily commented out)
import { getPresignedDownloadUrl } from '../../config/cloudinary';
// import { getPresignedDownloadUrl } from '../../config/s3'; // AWS S3 (disabled)

export const guideController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const { brand, model, problemCategory, search } = req.query;
    const filter: any = {};

    if (brand && typeof brand === 'string') filter.brand = { $regex: brand.trim(), $options: 'i' };
    if (model && typeof model === 'string') filter.model = { $regex: model.trim(), $options: 'i' };
    if (problemCategory && problemCategory !== 'all') filter.problemCategory = problemCategory;

    if (search && typeof search === 'string') {
      const regex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [{ title: regex }, { brand: regex }, { model: regex }, { summary: regex }];
    }

    const guides = await RepairGuide.find(filter).select('-schematicPdfS3Key -videoS3Key').sort({ createdAt: -1 });

    // Include shop subscription status in response
    const shop = await Shop.findById(req.user!.shopId).select('subscription');
    const isPro = shop?.subscription?.plan === 'pro' && shop?.subscription?.status === 'active';

    res.json({ success: true, guides, isPro });
  },

  async getDetails(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const guide = await RepairGuide.findById(id);
    if (!guide) {
      res.status(404).json({ success: false, message: 'Repair guide not found' });
      return;
    }

    const shop = await Shop.findById(req.user!.shopId);
    const isPro = shop?.subscription?.plan === 'pro' && shop?.subscription?.status === 'active';

    if (guide.isPremium && !isPro) {
      res.status(403).json({
        success: false,
        isPaywall: true,
        message: 'This repair guide and schematic is part of the Pro Technician Knowledge Base. Upgrade to unlock.',
        preview: {
          id: guide._id,
          title: guide.title,
          brand: guide.brand,
          model: guide.model,
          problemCategory: guide.problemCategory,
          summary: guide.summary,
          difficulty: guide.difficulty,
          isPremium: true,
        },
      });
      return;
    }

    // Generate Cloudinary delivery / signed URLs (AWS S3 temporarily commented out)
    // AWS S3: getPresignedDownloadUrl(guide.videoS3Key, 3600);
    let videoUrl = undefined;
    let schematicUrl = undefined;

    if (guide.videoS3Key) {
      videoUrl = await getPresignedDownloadUrl(guide.videoS3Key, 3600);
    }
    if (guide.schematicPdfS3Key) {
      schematicUrl = await getPresignedDownloadUrl(guide.schematicPdfS3Key, 3600);
    }

    res.json({
      success: true,
      guide,
      videoUrl,
      schematicUrl,
    });
  },

  /**
   * Seed Sample Guides for immediate use
   */
  async seedSamples(req: AuthRequest, res: Response): Promise<void> {
    const count = await RepairGuide.countDocuments();
    if (count > 0) {
      res.json({ success: true, message: `Guides already seeded (${count} guides exist)` });
      return;
    }

    const sampleGuides = [
      {
        title: 'iPhone 13 / 13 Pro OLED Screen Replacement & True Tone Transfer',
        brand: 'Apple',
        model: 'iPhone 13',
        problemCategory: 'display',
        summary: 'Complete guide to safely removing the broken OLED panel, transferring the proximity sensor flex, and reprogramming True Tone using JC V1S programmer.',
        difficulty: 'medium',
        isPremium: true,
        videoS3Key: 'videos/apple/iphone13_screen_replacement.mp4',
        schematicPdfS3Key: 'schematics/apple/iphone13_display_boardview.pdf',
        steps: [
          { stepNumber: 1, title: 'Heat & Pentalobe Screws', description: 'Remove bottom 2x P2 Pentalobe screws. Heat display perimeter at 75°C for 2 minutes.' },
          { stepNumber: 2, title: 'Opening Left Side Caution', description: 'Pry open gently from right side like a book. CAUTION: Display flex cables are on the left side!' },
          { stepNumber: 3, title: 'Disconnect Battery First', description: 'Always disconnect battery connector first to avoid blowing the backlight / OLED diode on the logic board.' },
          { stepNumber: 4, title: 'Sensor Flex Transfer', description: 'Carefully heat and transfer the microphone/proximity sensor assembly to the new screen without tearing the ribbon.' },
        ],
      },
      {
        title: 'Samsung Galaxy S22 5G Battery & USB-C Sub-board Replacement',
        brand: 'Samsung',
        model: 'Galaxy S22',
        problemCategory: 'battery',
        summary: 'Safe disassembly of glass back, thermal adhesive release with isopropyl alcohol (IPA), and sub-board replacement for slow charging or no fast charge issues.',
        difficulty: 'medium',
        isPremium: true,
        videoS3Key: 'videos/samsung/s22_battery_fix.mp4',
        schematicPdfS3Key: 'schematics/samsung/galaxy_s22_schematic.pdf',
        steps: [
          { stepNumber: 1, title: 'Back Glass Removal', description: 'Heat back glass to 80°C. Use thin suction cup and plastic pry cards with IPA to slice adhesive.' },
          { stepNumber: 2, title: 'Wireless Charging Coil & Bracket', description: 'Remove 16x Phillips #00 screws and unclip the plastic midframe and wireless charging coil.' },
          { stepNumber: 3, title: 'Battery Extraction', description: 'Apply 99% IPA around battery perimeter. Wait 1 min for adhesive to soften. Pry out with flat plastic tool. DO NOT puncture battery.' },
        ],
      },
      {
        title: 'Dell XPS 15 9500 No Power / 19V Motherboard Short Diagnosis',
        brand: 'Dell',
        model: 'XPS 15 9500',
        problemCategory: 'motherboard',
        summary: 'Step-by-step multimeter board tracing for 19V rail short circuit, testing charging MOSFETs and replacing bad ceramic decoupling capacitor.',
        difficulty: 'expert',
        isPremium: true,
        videoS3Key: 'videos/dell/xps15_board_repair.mp4',
        schematicPdfS3Key: 'schematics/dell/xps15_la_j191p_schematic.pdf',
        steps: [
          { stepNumber: 1, title: 'Visual & Thermal Check', description: 'Inspect motherboard with thermal camera or alcohol mist while applying 1V 1A to 19V main rail.' },
          { stepNumber: 2, title: 'Measuring First & Second MOSFETs', description: 'Check resistance between Gate, Drain, and Source of input charging MOSFETs.' },
          { stepNumber: 3, title: 'Replace Shorted Capacitor', description: 'Use hot air station at 380°C to lift the shorted 10uF 25V 0805 capacitor. Retest diode mode.' },
        ],
      },
    ];

    await RepairGuide.insertMany(sampleGuides);
    res.json({ success: true, message: 'Sample repair guides seeded successfully!' });
  },
};
