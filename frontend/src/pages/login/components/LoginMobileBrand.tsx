import { Building2 } from 'lucide-react'

import { BRAND_PRIMARY } from '@/constants/brand'

export function LoginMobileBrand() {
  return (
    <div className="flex items-center gap-2 mb-8 lg:hidden">
      <Building2 className="w-5 h-5" style={{ color: BRAND_PRIMARY }} />
      <span className="font-bold text-lg" style={{ color: BRAND_PRIMARY }}>
        CorpLink
      </span>
    </div>
  )
}
