import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded'
import CheckroomRoundedIcon from '@mui/icons-material/CheckroomRounded'
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded'
import LocalGroceryStoreRoundedIcon from '@mui/icons-material/LocalGroceryStoreRounded'
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import LocalPharmacyRoundedIcon from '@mui/icons-material/LocalPharmacyRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded'
import SentimentSatisfiedAltRoundedIcon from '@mui/icons-material/SentimentSatisfiedAltRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import { Box, type SxProps, type Theme } from '@mui/material'
import type { SvgIconComponent } from '@mui/icons-material'
import { brand } from '../theme/tokens'
import type { MerchantCategoryValue, Transaction } from '../types/api'

const CATEGORY_ICONS: Record<MerchantCategoryValue, SvgIconComponent> = {
  pharmacy: LocalPharmacyRoundedIcon,
  hospital: LocalHospitalRoundedIcon,
  clinic: MedicalServicesRoundedIcon,
  dental: SentimentSatisfiedAltRoundedIcon,
  vision: VisibilityRoundedIcon,
  restaurant: RestaurantRoundedIcon,
  electronics: DevicesRoundedIcon,
  grocery: LocalGroceryStoreRoundedIcon,
  clothing: CheckroomRoundedIcon,
}

export const CATEGORY_LABELS: Record<MerchantCategoryValue, string> = {
  pharmacy: 'Pharmacy',
  hospital: 'Hospital',
  clinic: 'Clinic',
  dental: 'Dental',
  vision: 'Vision',
  restaurant: 'Restaurant',
  electronics: 'Electronics',
  grocery: 'Grocery',
  clothing: 'Clothing',
}

/** The icon for a merchant category. */
export function CategoryGlyph({ category, sx }: { category: MerchantCategoryValue; sx?: SxProps<Theme> }) {
  const Icon = CATEGORY_ICONS[category]
  return <Icon sx={sx} aria-hidden />
}

/** Rounded icon tile for a transaction: deposit, or the merchant's category. */
export function TransactionIcon({ transaction, size = 40 }: { transaction: Transaction; size?: number }) {
  const isDeposit = transaction.type === 'deposit'
  const declined = transaction.status === 'declined'
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '12px',
        display: 'grid',
        placeItems: 'center',
        bgcolor: declined ? brand.declineSoft : isDeposit ? brand.mint : '#EDF2F6',
        color: declined ? brand.decline : isDeposit ? brand.tealDark : brand.navy,
      }}
    >
      {isDeposit ? (
        <AccountBalanceRoundedIcon sx={{ fontSize: size * 0.5 }} />
      ) : (
        <CategoryGlyph category={transaction.merchant_category!} sx={{ fontSize: size * 0.5 }} />
      )}
    </Box>
  )
}
