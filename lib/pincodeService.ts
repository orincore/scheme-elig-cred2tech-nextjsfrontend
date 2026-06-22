interface PincodeData {
  pincode: string;
  city: string;
  state: string;
  district?: string;
}

class PincodeService {
  private cache = new Map<string, PincodeData>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  async getPincodeData(pincode: string): Promise<PincodeData | null> {
    console.log('Fetching pincode data for:', pincode);
    
    // Check cache first
    const cached = this.cache.get(pincode);
    if (cached && Date.now() - (cached as any).timestamp < this.CACHE_DURATION) {
      const result = { ...cached };
      delete (result as any).timestamp;
      console.log('Returning cached data for:', pincode);
      return result;
    }

    try {
      const apis = [
        `https://api.postalpincode.in/pincode/${pincode}`,
        `https://www.postalpincode.in/api/pincode/${pincode}`,
      ];

      for (const apiUrl of apis) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(apiUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!response.ok) continue;
          const data = await response.json();
          if (Array.isArray(data) && data[0]?.PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            const result: PincodeData = {
              pincode,
              city: po.District || po.Block || po.Name,
              state: po.State,
              district: po.District,
            };
            this.cache.set(pincode, { ...result, timestamp: Date.now() } as any);
            return result;
          }
        } catch {
          continue;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  isValidPincode(pincode: string): boolean {
    return /^\d{6}$/.test(pincode);
  }
}

export const pincodeService = new PincodeService();
