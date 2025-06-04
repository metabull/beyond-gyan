import React, { useState, useEffect } from "react";
import { getBeyondSdk } from "../utils/beyondSdk";

interface CreditBalance {
  monthlyLimit: string;
  monthlyCurrentUsage: string;
  totalCreditsUsed: string;
  totalCreditsPurchased: string;
}

const CreditsDisplay: React.FC = () => {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      // Get initialized Beyond SDK
      const beyond = await getBeyondSdk();
      const creditBalance = await beyond.credits.getBalance();
      setCredits(creditBalance);
    } catch (err: any) {
      setError(err.message || "Failed to fetch credits");
    } finally {
      setLoading(false);
    }
  };

  const getRemainingCredits = () => {
    if (!credits) return 0;
    return (
      parseFloat(credits.monthlyLimit) - parseFloat(credits.monthlyCurrentUsage)
    );
  };

  const getCreditsDisplayClass = () => {
    const remaining = getRemainingCredits();
    if (remaining <= 0) return "credits-display-simple credits-empty";
    if (remaining <= 5) return "credits-display-simple credits-low";
    return "credits-display-simple";
  };

  if (loading) {
    return (
      <div className="credits-display-simple">
        <div className="credits-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="credits-display-simple">
        <div className="credits-error">Credits unavailable</div>
      </div>
    );
  }

  const remainingCredits = getRemainingCredits();

  return (
    <div className={getCreditsDisplayClass()}>
      <span className="credits-icon">
        {remainingCredits <= 0 ? "⚠️" : remainingCredits <= 5 ? "⚡" : "✨"}
      </span>
      <span className="credits-count">{remainingCredits.toFixed(0)}</span>
      <span className="credits-label">
        {remainingCredits <= 0 ? "No Credits" : "Beyond Credits"}
      </span>
    </div>
  );
};

export default CreditsDisplay;
