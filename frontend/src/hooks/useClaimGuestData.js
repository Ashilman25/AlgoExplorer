import { useCallback } from 'react'
import { useToast } from '../components/ui/Toast'
import { authService } from '../services/authService'
import { useGuestStore } from '../stores/useGuestStore'


export function useClaimGuestData() {
  const toast = useToast()
  const { runs, scenarios, clearAll } = useGuestStore()

  return useCallback(async () => {
    // Extract server-side run IDs from guest history
    const runIds = runs
      .map((r) => r.run_id)
      .filter((id) => typeof id === 'number')

    if (runIds.length === 0 && scenarios.length === 0) return

    try {
      const result = await authService.claimGuestData({
        run_ids: runIds,
        benchmark_ids: [],
      })

      const parts = []
      if (result.runs_claimed > 0) parts.push(`${result.runs_claimed} run${result.runs_claimed !== 1 ? 's' : ''}`)
      if (result.benchmarks_claimed > 0) parts.push(`${result.benchmarks_claimed} benchmark${result.benchmarks_claimed !== 1 ? 's' : ''}`)

      if (parts.length > 0) {
        toast({
          type: 'success',
          title: 'Guest data imported',
          message: `${parts.join(' and ')} linked to your account.`,
        })
      }

      // Clear localStorage guest data after successful claim
      clearAll()
    } catch {
      // Claim failure is non-critical — guest data stays in localStorage
    }
  }, [runs, scenarios, clearAll, toast])
}
