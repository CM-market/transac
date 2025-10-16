import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck } from "lucide-react";

interface SellerInfoProps {
  seller: {
    name: string;
    isVerified: boolean;
  };
}

const SellerInfo: React.FC<SellerInfoProps> = ({ seller }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Seller Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="/placeholder.svg" alt={seller.name} />
            <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{seller.name}</h3>
              {seller.isVerified && (
                <ShieldCheck className="h-5 w-5 text-cm-green" />
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Star className="h-4 w-4 text-cm-yellow" fill="currentColor" />
              <span>4.9 (2,000+ sales)</span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="outline" className="w-full">
            Contact Seller
          </Button>
          <Button className="w-full bg-cm-green hover:bg-cm-forest">
            Visit Store
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SellerInfo;
