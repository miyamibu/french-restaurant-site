import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // Vercel からのリクエストか確認（セキュリティ）
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 7日以前に削除された注文を完全削除
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoString = sevenDaysAgo.toISOString()

    const { data: oldHistories, error: selectError } = await supabaseServer
      .from('order_history')
      .select('id')
      .lt('deleted_at', sevenDaysAgoString)

    if (selectError) {
      console.error('Failed to fetch old histories:', selectError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!oldHistories || oldHistories.length === 0) {
      return NextResponse.json({
        message: 'No old order histories to delete',
        deletedCount: 0,
      })
    }

    const oldIds = oldHistories.map((h) => h.id)

    // 古い注文履歴を完全削除
    const { error: deleteError } = await supabaseServer
      .from('order_history')
      .delete()
      .in('id', oldIds)

    if (deleteError) {
      console.error('Failed to delete old histories:', deleteError)
      return NextResponse.json({ error: 'Delete error' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Successfully deleted old order histories',
      deletedCount: oldHistories.length,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
