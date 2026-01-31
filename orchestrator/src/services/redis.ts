import Redis from 'ioredis';
import { logger } from './logger';

export class RedisService {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private handlers: Map<string, ((message: string) => void)[]>;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    this.subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.handlers = new Map();

    this.client.on('error', (err) => logger.error('Redis client error', err));
    this.subscriber.on('error', (err) => logger.error('Redis subscriber error', err));
    this.publisher.on('error', (err) => logger.error('Redis publisher error', err));

    this.client.on('connect', () => logger.info('Redis client connected'));
    this.subscriber.on('connect', () => logger.info('Redis subscriber connected'));

    this.subscriber.on('message', (channel: string, message: string) => {
      const channelHandlers = this.handlers.get(channel);
      if (channelHandlers) {
        channelHandlers.forEach((handler) => handler(message));
      }
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      await this.subscriber.connect();
      await this.publisher.connect();
      logger.info('Redis connections established');
    } catch (error) {
      logger.warn('Redis connection failed - running without Redis', error);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
    logger.info('Redis connections closed');
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key: ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Redis SET error for key: ${key}`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key: ${key}`, error);
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.publisher.publish(channel, message);
    } catch (error) {
      logger.error(`Redis PUBLISH error on channel: ${channel}`, error);
    }
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    try {
      if (!this.handlers.has(channel)) {
        this.handlers.set(channel, []);
        await this.subscriber.subscribe(channel);
      }
      this.handlers.get(channel)!.push(handler);
    } catch (error) {
      logger.error(`Redis SUBSCRIBE error on channel: ${channel}`, error);
    }
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    const value = await this.get(`cache:${key}`);
    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  async cacheSet<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    await this.set(`cache:${key}`, JSON.stringify(value), ttlSeconds);
  }
}
