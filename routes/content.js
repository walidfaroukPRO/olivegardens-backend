const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ===== PUBLIC ROUTES =====

// Get Hero Content
router.get('/hero', async (req, res) => {
  try {
    let content = await Content.findOne({ section: 'hero' });
    
    if (!content) {
      content = await Content.create({
        section: 'hero',
        heroSlides: [{
          title: { en: '', ar: '', es: '' },
          subtitle: { en: '', ar: '', es: '' },
          buttonText: { en: '', ar: '', es: '' },
          buttonLink: '',
          image: '',
          order: 1,
          isActive: true
        }]
      });
    }

    res.json(content);
  } catch (error) {
    console.error('Error fetching hero:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get About Content
router.get('/about', async (req, res) => {
  try {
    let content = await Content.findOne({ section: 'about' });
    
    if (!content) {
      content = await Content.create({
        section: 'about',
        about: {
          title: { en: '', ar: '', es: '' },
          story: { en: '', ar: '', es: '' },
          mission: { en: '', ar: '', es: '' },
          vision: { en: '', ar: '', es: '' },
          foundedYear: '1980',
          companyType: { en: '', ar: '', es: '' },
          image: ''
        },
        stats: [
          { number: '50+', label: { en: 'Countries Served', ar: 'دولة نخدمها', es: 'Países Servidos' }, icon: '🌍' },
          { number: '44+', label: { en: 'Years Experience', ar: 'سنة خبرة', es: 'Años de Experiencia' }, icon: '⭐' }
        ]
      });
    }

    res.json(content);
  } catch (error) {
    console.error('Error fetching about:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Contact Info
router.get('/contact-info', async (req, res) => {
  try {
    let content = await Content.findOne({ section: 'contact-info' });
    
    if (!content) {
      content = await Content.create({
        section: 'contact-info',
        contactInfo: {
          phone: '+20 123 456 7890',
          email: 'info@olivegardens.com',
          address: { en: 'Cairo, Egypt', ar: 'القاهرة، مصر', es: 'El Cairo, Egipto' },
          workingHours: { en: 'Sat-Thu: 9AM-6PM', ar: 'السبت-الخميس: 9ص-6م', es: 'Sáb-Jue: 9AM-6PM' },
          social: {
            facebook: 'https://facebook.com/olivegardens',
            twitter: 'https://twitter.com/olivegardens',
            instagram: 'https://instagram.com/olivegardens',
            linkedin: 'https://linkedin.com/company/olivegardens'
          }
        }
      });
    }

    res.json(content);
  } catch (error) {
    console.error('Error fetching contact info:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Company Info (Footer)
router.get('/footer', async (req, res) => {
  try {
    let content = await Content.findOne({ section: 'footer' });
    
    if (!content) {
      content = await Content.create({
        section: 'footer',
        companyInfo: {
          name: { en: 'OliveGardens', ar: 'OliveGardens', es: 'OliveGardens' },
          shortDescription: {
            en: 'Premium quality olive products since 1980',
            ar: 'منتجات زيتون عالية الجودة منذ 1980',
            es: 'Productos de aceituna premium desde 1980'
          },
          logo: ''
        }
      });
    }

    res.json(content);
  } catch (error) {
    console.error('Error fetching company info:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Features
router.get('/features', async (req, res) => {
  try {
    let content = await Content.findOne({ section: 'features' });
    
    if (!content) {
      content = await Content.create({
        section: 'features',
        features: []
      });
    }

    res.json(content);
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== ADMIN ROUTES =====

// Update Hero Section
router.put('/hero', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { heroSlides } = req.body;

    if (!heroSlides || !Array.isArray(heroSlides)) {
      return res.status(400).json({ message: 'Invalid heroSlides data' });
    }

    let content = await Content.findOne({ section: 'hero' });

    if (!content) {
      content = new Content({
        section: 'hero',
        heroSlides: heroSlides,
        updatedBy: req.user._id
      });
    } else {
      content.heroSlides = heroSlides;
      content.updatedBy = req.user._id;
    }

    await content.save();
    res.json({ message: 'Hero section updated successfully', content });
  } catch (error) {
    console.error('Error updating hero:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update About Section
router.put('/about', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { about, stats } = req.body;

    if (!about) {
      return res.status(400).json({ message: 'Invalid about data' });
    }

    let content = await Content.findOne({ section: 'about' });

    if (!content) {
      content = new Content({
        section: 'about',
        about: about,
        stats: stats || [],
        updatedBy: req.user._id
      });
    } else {
      content.about = about;
      if (stats) content.stats = stats;
      content.updatedBy = req.user._id;
    }

    await content.save();
    res.json({ message: 'About section updated successfully', content });
  } catch (error) {
    console.error('Error updating about:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Contact Info
router.put('/contact-info', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { contactInfo } = req.body;

    if (!contactInfo) {
      return res.status(400).json({ message: 'Invalid contact info data' });
    }

    let content = await Content.findOne({ section: 'contact-info' });

    if (!content) {
      content = new Content({
        section: 'contact-info',
        contactInfo: contactInfo,
        updatedBy: req.user._id
      });
    } else {
      content.contactInfo = contactInfo;
      content.updatedBy = req.user._id;
    }

    await content.save();
    res.json({ message: 'Contact info updated successfully', content });
  } catch (error) {
    console.error('Error updating contact info:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Company Info
router.put('/company-info', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { companyInfo } = req.body;

    if (!companyInfo) {
      return res.status(400).json({ message: 'Invalid company info data' });
    }

    let content = await Content.findOne({ section: 'footer' });

    if (!content) {
      content = new Content({
        section: 'footer',
        companyInfo: companyInfo,
        updatedBy: req.user._id
      });
    } else {
      content.companyInfo = companyInfo;
      content.updatedBy = req.user._id;
    }

    await content.save();
    res.json({ message: 'Company info updated successfully', content });
  } catch (error) {
    console.error('Error updating company info:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Features Section
router.put('/features', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { features } = req.body;

    let content = await Content.findOne({ section: 'features' });

    if (!content) {
      content = new Content({
        section: 'features',
        features: features || [],
        updatedBy: req.user._id
      });
    } else {
      content.features = features || [];
      content.updatedBy = req.user._id;
    }

    await content.save();
    res.json({ message: 'Features updated successfully', content });
  } catch (error) {
    console.error('Error updating features:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get All Content Sections (Admin)
router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const content = await Content.find();
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch content', error: error.message });
  }
});

// Initialize Default Content (Run once)
router.post('/initialize', authenticateToken, isAdmin, async (req, res) => {
  try {
    const existingContent = await Content.findOne();
    if (existingContent) {
      return res.status(400).json({ message: 'Content already initialized' });
    }

    const defaultContent = [
      {
        section: 'hero',
        heroSlides: [
          {
            title: {
              en: "Premium Quality Olive Products",
              ar: "منتجات زيتون بجودة عالمية",
              es: "Productos de Aceituna Premium"
            },
            subtitle: {
              en: "Exporting Excellence Since 1980",
              ar: "نصدر التميز منذ 1980",
              es: "Exportando Excelencia Desde 1980"
            },
            image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1600",
            buttonText: {
              en: "Explore Products",
              ar: "استكشف المنتجات",
              es: "Explorar Productos"
            },
            buttonLink: "/products",
            order: 1,
            isActive: true
          }
        ],
        updatedBy: req.user._id
      },
      {
        section: 'about',
        about: {
          title: {
            en: "About OliveGardens",
            ar: "عن OliveGardens",
            es: "Sobre OliveGardens"
          },
          story: {
            en: "OliveGardens Co. for production and agricultural manufacture S.A.E. was established on 1980...",
            ar: "تأسست شركة OliveGardens للإنتاج والتصنيع الزراعي في عام 1980...",
            es: "OliveGardens Co. para producción y manufactura agrícola S.A.E. fue establecida en 1980..."
          },
          foundedYear: "1980",
          companyType: {
            en: "Egyptian Contribution Company (S.A.E.)",
            ar: "شركة مساهمة مصرية (ش.م.م)",
            es: "Compañía de Contribución Egipcia (S.A.E.)"
          },
          image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800"
        },
        stats: [
          { number: '50+', label: { en: 'Countries Served', ar: 'دولة نخدمها', es: 'Países Servidos' }, icon: '🌍', order: 1 },
          { number: '44+', label: { en: 'Years Experience', ar: 'سنة خبرة', es: 'Años de Experiencia' }, icon: '⭐', order: 2 }
        ],
        updatedBy: req.user._id
      },
      {
        section: 'contact-info',
        contactInfo: {
          phone: "+20 123 456 7890",
          email: "info@olivegardens.com",
          address: {
            en: "Cairo, Egypt",
            ar: "القاهرة، مصر",
            es: "Cairo, Egipto"
          },
          workingHours: {
            en: "Sat-Thu: 9:00 AM - 6:00 PM",
            ar: "السبت-الخميس: 9:00 ص - 6:00 م",
            es: "Sáb-Jue: 9:00 AM - 6:00 PM"
          },
          social: {
            facebook: "https://facebook.com/olivegardens",
            twitter: "https://twitter.com/olivegardens",
            instagram: "https://instagram.com/olivegardens",
            linkedin: "https://linkedin.com/company/olivegardens"
          }
        },
        updatedBy: req.user._id
      },
      {
        section: 'footer',
        companyInfo: {
          name: {
            en: "OliveGardens",
            ar: "OliveGardens",
            es: "OliveGardens"
          },
          shortDescription: {
            en: "Providing premium quality olive products to global markets since 1980",
            ar: "نقدم أفضل منتجات الزيتون عالية الجودة للأسواق العالمية منذ 1980",
            es: "Proporcionando productos de aceituna de calidad premium a mercados globales desde 1980"
          }
        },
        updatedBy: req.user._id
      },
      {
        section: 'features',
        features: [],
        updatedBy: req.user._id
      }
    ];

    await Content.insertMany(defaultContent);

    res.json({ message: 'Default content initialized successfully' });
  } catch (error) {
    console.error('Error initializing content:', error);
    res.status(500).json({ message: 'Failed to initialize content', error: error.message });
  }
});

module.exports = router;