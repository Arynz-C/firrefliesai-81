import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import firefliesLogo from "@/assets/fireflies-logo.png";

export const Pricing = () => {
  const { user, profile, checkSubscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  useEffect(() => {
    // Check subscription status when component mounts
    if (user) {
      handleCheckSubscription();
    }
  }, [user]);

  const handleCheckSubscription = async () => {
    setIsCheckingSubscription(true);
    try {
      await checkSubscription();
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  const handleWhatsAppUpgrade = () => {
    const phoneNumber = "083171750811";
    const message = "hai saya ingin upgrade ke pro";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "WhatsApp Terbuka",
      description: "Silakan kirim pesan untuk upgrade ke Pro!",
    });
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoading('manage');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open Stripe customer portal in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManualUpgrade = async () => {
    if (!user) return;

    setLoading('manual');
    try {
      const { data, error } = await supabase.functions.invoke('set-manual-upgrade', {
        body: { 
          userId: user.id, 
          subscriptionPlan: 'pro',
          enable: true 
        }
      });
      
      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Manual upgrade to Pro completed!",
      });

      // Refresh subscription status
      await checkSubscription();
    } catch (error) {
      console.error('Error with manual upgrade:', error);
      toast({
        title: "Error",
        description: "Failed to upgrade manually. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveManualUpgrade = async () => {
    if (!user) return;

    setLoading('remove');
    try {
      const { data, error } = await supabase.functions.invoke('set-manual-upgrade', {
        body: { 
          userId: user.id, 
          subscriptionPlan: 'free',
          enable: false 
        }
      });
      
      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Manual upgrade removed, back to Free plan!",
      });

      // Refresh subscription status
      await checkSubscription();
    } catch (error) {
      console.error('Error removing manual upgrade:', error);
      toast({
        title: "Error",
        description: "Failed to remove manual upgrade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const freeFeatures = [
    "Akses ke GPT-4o mini dan penelaian",
    "Mode suara standar",
    "Data waktu nyata dari web dengan pencarian", 
    "Akses terbatas ke GPT-4o dan o4-mini",
    "Akses terbatas ke unggahan file, analisis data tingkat lanjut, dan pembuatan gambar",
    "Gunakan GPT kustom"
  ];

  const proFeatures = [
    "Semua yang ada di Free",
    "Balasan ditambah untuk pesan, unggahan file, analisis data tingkat lanjut, dan pembuatan gambar",
    "Akses tidak terbatas ke semua model penalaran dan GPT-4o",
    "Akses luas ke riset mendalam yang melakukan riset online multilingkah untuk tugas kompleks",
    "Akses ke pembuatan video Sora",
    "Kesempatan untuk menguji fitur baru"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <img src={firefliesLogo} alt="FireFlies" className="w-8 h-8" />
            <h1 className="text-xl font-semibold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              FireFlies
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <Button
                variant="outline"
                onClick={handleCheckSubscription}
                disabled={isCheckingSubscription}
                className="flex items-center gap-2"
              >
                {isCheckingSubscription && <Loader2 className="w-4 h-4 animate-spin" />}
                Refresh Status
              </Button>
            )}
            <Button 
              variant="ghost" 
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2"
            >
              Back to Chat
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Choose Your Plan
          </h2>
          <p className="text-xl text-muted-foreground">
            Perlu kemampuan lebih untuk bisnis Anda?
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="relative border-2 border-border">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold">Free</CardTitle>
              <div className="text-4xl font-bold mt-4">
                $0
                <span className="text-base font-normal text-muted-foreground">/bulan</span>
              </div>
              <p className="text-muted-foreground mt-2">
                Jelajahi bagaimana AI dapat membantu Anda dengan tugas sehari-hari
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Plan Indicator */}
              {profile?.subscription_plan === 'free' && (
                <Badge variant="secondary" className="w-full justify-center py-2">
                  Paket Anda saat ini
                </Badge>
              )}
              
              {!user && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate('/auth')}
                >
                  Get Started
                </Button>
              )}
              
              <div className="space-y-3">
                {freeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-1">
                <Star className="w-4 h-4 mr-1" />
                Most Popular
              </Badge>
            </div>
            
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold">Pro</CardTitle>
              <div className="text-4xl font-bold mt-4">
                $20
                <span className="text-base font-normal text-muted-foreground">/bulan</span>
              </div>
              <p className="text-muted-foreground mt-2">
                Tingkatkan produktivitas dan kreativitas dengan akses lebih luas
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Action Button */}
              {profile?.subscription_plan === 'pro' ? (
                <div className="space-y-3">
                  <Badge variant="default" className="w-full justify-center py-2 bg-green-500 hover:bg-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    Active Subscription
                  </Badge>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleManageSubscription}
                    disabled={loading === 'manage'}
                  >
                    {loading === 'manage' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2" 
                    onClick={handleWhatsAppUpgrade}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785"/>
                    </svg>
                    Upgrade via WhatsApp
                  </Button>
                </div>
              )}
              
              <div className="space-y-3">
                {proFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Bottom Section */}
        <div className="text-center mt-12 pt-8 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>💡</span>
            <span>Perlu kemampuan lebih untuk bisnis Anda?</span>
          </div>
          <Button variant="link" className="mt-2">
            Lihat FireFlies Enterprise
          </Button>
        </div>
      </div>
    </div>
  );
};