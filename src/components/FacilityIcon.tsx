import {
  Building2,
  Lamp,
  Dumbbell,
  Lock,
  HelpCircle,
} from 'lucide-react';
import type { FacilityType } from '../../shared/types';

interface FacilityIconProps {
  type: FacilityType;
  className?: string;
}

const iconMap: Record<FacilityType, typeof Building2> = {
  elevator: Building2,
  streetlight: Lamp,
  fitness: Dumbbell,
  access: Lock,
  other: HelpCircle,
};

const colorMap: Record<FacilityType, string> = {
  elevator: 'text-blue-600 bg-blue-50',
  streetlight: 'text-yellow-600 bg-yellow-50',
  fitness: 'text-green-600 bg-green-50',
  access: 'text-purple-600 bg-purple-50',
  other: 'text-gray-600 bg-gray-50',
};

export function FacilityIcon({ type, className = '' }: FacilityIconProps) {
  const Icon = iconMap[type];
  const colorClass = colorMap[type];

  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass} ${className}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
}
