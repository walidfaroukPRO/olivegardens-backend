const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const { authenticateToken, isAdmin } = require('./auth');
const { upload, cloudinary } = require('../config/cloudinary');

// Get Content by Section (Public)
router.get('/:section', async (req, res) => {
  try {
    const content = await Content.findOne({ section: req.params.section });
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch content', error: error.message });
  }
});

// Get All Content Sections (Admin)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const content = await Content.find();
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch content', error: error.message });
  }
});

// Update Hero Section (Admin) - With Cloudinary
router.put('/hero', authenticateToken, isAdmin, upload.array('images', 10), async (req, res) => {
  try {
    const heroData = JSON.parse(req.body.heroData);
    
    // Add uploaded images from Cloudinary if any
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        if (heroData.heroSlides[index]) {
          heroData.heroSlides[index].image = file.path; // Cloudinary URL
          heroData.heroSlides[index].publicId = file.filename;
        }
      });
    }
    
    heroData.updatedBy = req.user.userId;
    
    let content = await Content.findOne({ section: 'hero' });
    
    if (!content) {
      content = new Content({ section: 'hero', ...heroData });
    } else {
      content.heroSlides = heroData.heroSlides;
      content.updatedBy = req.user.userId;
    }
    
    await content.save();
    
    res.json({ message: 'Hero section updated successfully', content });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update hero section', error: error.message });
  }
});

// Update About Section (Admin) - With Cloudinary
router.put('/about', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const aboutData = JSON.parse(req.body.aboutData);
    
    if (req.file) {
      aboutData.about.image = req.file.path; // Cloudinary URL
      aboutData.about.publicId = req.file.filename;
    }
    
    aboutData.updatedBy = req.user.userId;
    
    let content = await Content.findOne({ section: 'about' });
    
    if (!content) {
      content = new Content({ section: 'about', ...aboutData });
    } else {
      content.about = aboutData.about;
      content.stats = aboutData.stats || content.stats;
      content.updatedBy = req.user.userId;
    }
    
    await content.save();
    
    res.json({ message: 'About section updated successfully', content });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update about section', error: error.message });
  }
});

// Update Features Section (Admin)
router.put('/features', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { features } = req.body;
    
    let content = await Content.findOne({ section: 'features' });
    
    if (!content) {
      content = new Content({ 
        section: 'features', 
        features,
        updatedBy: req.user.userId
      });
    } else {
      content.features = features;
      content.updatedBy = req.user.userId;
    }
    
    await content.save();
    
    res.json({ message: 'Features updated successfully', content });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update features', error: error.message });
  }
});

// Update Contact Info (Admin)
router.put('/contact-info', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { contactInfo } = req.body;
    
    let content = await Content.findOne({ section: 'contact-info' });
    
    if (!content) {
      content = new Content({ 
        section: 'contact-info', 
        contactInfo,
        updatedBy: req.user.userId
      });
    } else {
      content.contactInfo = contactInfo;
      content.updatedBy = req.user.userId;
    }
    
    await content.save();
    
    res.json({ message: 'Contact info updated successfully', content });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update contact info', error: error.message });
  }
});

// Update Company Info (Admin) - With Cloudinary
router.put('/company-info', authenticateToken, isAdmin, upload.single('logo'), async (req, res) => {
  try {
    const companyData = JSON.parse(req.body.companyData);
    
    if (req.file) {
      companyData.logo = req.file.path; // Cloudinary URL
      companyData.logoPublicId = req.file.filename;
    }
    
    let content = await Content.findOne({ section: 'footer' });
    
    if (!content) {
      content = new Content({ 
        section: 'footer', 
        companyInfo: companyData,
        updatedBy: req.user.userId
      });
    } else {
      content.companyInfo = companyData;
      content.updatedBy = req.user.userId;
    }
    
    await content.save();
    
    res.json({ message: 'Company info updated successfully', content });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update company info', error: error.message });
  }
});

// Initialize Default Content (Run once)
router.post('/initialize', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Check if content already exists
    const existingContent = await Content.findOne();
    if (existingContent) {
      return res.status(400).json({ message: 'Content already initialized' });
    }
    
    // Create default content with Cloudinary URLs (or placeholder URLs)
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
        ]
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
        }
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
        }
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
        }
      }
    ];
    
    await Content.insertMany(defaultContent);
    
    res.json({ message: 'Default content initialized successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to initialize content', error: error.message });
  }
});

module.exports = router;