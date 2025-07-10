const redis = require('redis');
const config = require('../config');

class DashboardCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutos
    this.init();
  }

  async init() {
    try {
      // Intentar conectar a Redis si está disponible
      if (config.REDIS_URL) {
        this.client = redis.createClient({
          url: config.REDIS_URL
        });

        this.client.on('error', (err) => {
          console.warn('Redis error:', err);
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          console.log('✅ Redis conectado para cache del dashboard');
          this.isConnected = true;
        });

        await this.client.connect();
      } else {
        console.warn('⚠️ Redis no configurado. Cache deshabilitado.');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo conectar a Redis:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Generar clave de cache para métricas
   */
  generateCacheKey(companyId, type, filters = {}) {
    const filterStr = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    
    return `dashboard:${companyId}:${type}:${filterStr}`;
  }

  /**
   * Obtener datos del cache
   */
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Error al obtener del cache:', error);
      return null;
    }
  }

  /**
   * Guardar datos en cache
   */
  async set(key, data, ttl = this.defaultTTL) {
    if (!this.isConnected) return;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.warn('Error al guardar en cache:', error);
    }
  }

  /**
   * Invalidar cache por patrón
   */
  async invalidatePattern(pattern) {
    if (!this.isConnected) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`Cache invalidado: ${keys.length} claves eliminadas`);
      }
    } catch (error) {
      console.warn('Error al invalidar cache:', error);
    }
  }

  /**
   * Invalidar cache de una empresa
   */
  async invalidateCompanyCache(companyId) {
    await this.invalidatePattern(`dashboard:${companyId}:*`);
  }

  /**
   * Middleware para cache automático
   */
  cacheMiddleware(type, ttl = this.defaultTTL) {
    return async (req, res, next) => {
      if (!this.isConnected) {
        return next();
      }

      const companyId = req.user.companyId;
      const filters = req.query;
      const cacheKey = this.generateCacheKey(companyId, type, filters);

      try {
        const cachedData = await this.get(cacheKey);
        
        if (cachedData) {
          console.log(`📦 Cache hit para ${type} - ${companyId}`);
          return res.json({
            success: true,
            data: cachedData,
            cached: true,
            cacheKey: cacheKey
          });
        }

        // Interceptar la respuesta para cachear
        const originalSend = res.send;
        res.send = function(data) {
          try {
            const parsedData = JSON.parse(data);
            if (parsedData.success && parsedData.data) {
              dashboardCache.set(cacheKey, parsedData.data, ttl);
              console.log(`💾 Datos cacheados para ${type} - ${companyId}`);
            }
          } catch (error) {
            console.warn('Error al cachear respuesta:', error);
          }
          
          originalSend.call(this, data);
        };

        next();
      } catch (error) {
        console.warn('Error en cache middleware:', error);
        next();
      }
    };
  }

  /**
   * Obtener estadísticas del cache
   */
  async getStats() {
    if (!this.isConnected) {
      return {
        connected: false,
        message: 'Redis no está conectado'
      };
    }

    try {
      const info = await this.client.info('memory');
      const keyCount = await this.client.dbSize();
      
      return {
        connected: true,
        keyCount: keyCount,
        memoryInfo: info
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Limpiar todo el cache del dashboard
   */
  async clearDashboardCache() {
    await this.invalidatePattern('dashboard:*');
  }

  /**
   * Configurar TTL por tipo de métrica
   */
  getTTLByType(type) {
    const ttlConfig = {
      'overview': 300,      // 5 minutos
      'messages': 600,      // 10 minutos
      'contacts': 900,      // 15 minutos
      'performance': 1800,  // 30 minutos
      'export': 60          // 1 minuto
    };

    return ttlConfig[type] || this.defaultTTL;
  }

  /**
   * Precalcular métricas comunes
   */
  async warmupCache(companyId) {
    if (!this.isConnected) return;

    console.log(`🔥 Calentando cache para empresa ${companyId}`);
    
    // Simular requests comunes para precalcular
    const commonQueries = [
      { type: 'overview', filters: {} },
      { type: 'messages', filters: { period: 'day' } },
      { type: 'contacts', filters: { limit: 10 } },
      { type: 'performance', filters: {} }
    ];

    for (const query of commonQueries) {
      const cacheKey = this.generateCacheKey(companyId, query.type, query.filters);
      const exists = await this.get(cacheKey);
      
      if (!exists) {
        // Aquí podrías ejecutar las queries directamente
        console.log(`⏳ Precalculando ${query.type} para ${companyId}`);
      }
    }
  }

  /**
   * Programar invalidación automática
   */
  scheduleInvalidation() {
    // Invalidar cache cada hora
    setInterval(() => {
      this.invalidatePattern('dashboard:*:overview:*');
      console.log('🔄 Cache overview invalidado automáticamente');
    }, 3600000); // 1 hora

    // Invalidar cache de mensajes cada 10 minutos
    setInterval(() => {
      this.invalidatePattern('dashboard:*:messages:*');
      console.log('🔄 Cache messages invalidado automáticamente');
    }, 600000); // 10 minutos
  }
}

// Instancia singleton
const dashboardCache = new DashboardCache();

module.exports = dashboardCache; 