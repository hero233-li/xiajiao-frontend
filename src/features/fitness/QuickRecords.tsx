import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fitnessApi, localToday, useFitnessMutation, type Day } from '../../api/fitness';
import { Button } from '../../components/Button';
import { UnsavedGuard } from './UnsavedGuard';
export function QuickRecords({ day, onlyWeight = false }: { day: Day; onlyWeight?: boolean }) {
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const readLatest = async () => {
    setRefreshing(true);
    try {
      await client.fetchQuery({
        queryKey: ['fitness', 'day', day.date],
        queryFn: () => fitnessApi.day(day.date),
        staleTime: 0,
      });
      setNotice('已读取最新记录，输入仍保留。核对上方记录后，可重新保存。');
    } catch (error) {
      setNotice(`重新读取失败：${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setRefreshing(false);
    }
  };
  const [kg, setKg] = useState('');
  const [ml, setMl] = useState('');
  const [notice, setNotice] = useState('');
  const weight = useFitnessMutation(),
    water = useFitnessMutation(),
    checkin = useFitnessMutation();
  const future = day.date > localToday();
  const saveWeight = async () => {
    try {
      await weight.mutateAsync(() =>
        fitnessApi.save(
          'weight',
          day.date,
          { kg: Number(kg), note: day.records.weight?.data?.note ?? null },
          day.records.weight?.revision ?? -1,
        ),
      );
      setKg('');
      setNotice('体重已保存');
    } catch {
      /* mutation renders the error; input remains */
    }
  };
  const saveWater = async (value: number) => {
    try {
      await water.mutateAsync(() =>
        fitnessApi.save('water', day.date, { ml: value }, day.records.water?.revision ?? -1),
      );
      setMl('');
      setNotice('饮水已保存');
    } catch {
      /* retain input */
    }
  };
  return (
    <section className={`quick-records ${onlyWeight ? 'quick-weight' : ''}`} aria-label="快速记录">
      <UnsavedGuard dirty={!!kg || !!ml} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void saveWeight();
        }}
      >
        <h2>体重</h2>
        <p>
          {day.records.weight?.data ? `${day.records.weight.data.kg} kg · 已记录` : '当天尚未记录'}
        </p>
        <label>
          体重（kg）
          <input
            inputMode="decimal"
            type="number"
            min="0.001"
            max="999999"
            step="any"
            required
            value={kg}
            disabled={future || weight.isPending}
            onChange={(e) => setKg(e.target.value)}
          />
        </label>
        <Button type="submit" loading={weight.isPending} disabled={future}>
          保存体重
        </Button>
        {weight.error && <p role="alert">{weight.error.message}。输入已保留。</p>}
      </form>
      {!onlyWeight && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveWater(Number(ml));
            }}
          >
            <h2>饮水</h2>
            <p>{day.records.water?.data?.ml ?? 0} ml · 当天总量</p>
            <label>
              饮水总量（ml）
              <input
                inputMode="numeric"
                type="number"
                min="0"
                max="20000"
                step="1"
                required
                value={ml}
                disabled={future || water.isPending}
                onChange={(e) => setMl(e.target.value)}
              />
            </label>
            <div className="row">
              <Button type="submit" loading={water.isPending} disabled={future}>
                保存总量
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={future || water.isPending}
                onClick={() => void saveWater((day.records.water?.data?.ml ?? 0) + 250)}
              >
                ＋250 ml
              </Button>
            </div>
            {water.error && <p role="alert">{water.error.message}。输入已保留。</p>}
          </form>
          <div>
            <h2>每日打卡</h2>
            <p>{day.checkedIn ? '已打卡' : '尚未打卡'}</p>
            <p className="help">体重、训练和饮食分别保存，打卡无需先填满其他记录。</p>
            <Button
              disabled={future || day.checkedIn}
              disabledReason={future ? '未来日期不能填写实际打卡' : '当天已经完成打卡'}
              loading={checkin.isPending}
              onClick={() =>
                void checkin
                  .mutateAsync(() =>
                    fitnessApi.save(
                      'checkin',
                      day.date,
                      { sleepHours: null, feeling: null, note: null },
                      day.records.checkin?.revision ?? -1,
                    ),
                  )
                  .then(() => setNotice('打卡已保存'))
                  .catch(() => undefined)
              }
            >
              {day.checkedIn ? '今天已打卡' : '完成打卡'}
            </Button>
            {checkin.error && <p role="alert">{checkin.error.message}</p>}
          </div>
        </>
      )}
      {future && <p className="quick-notice">未来日期可安排训练与食谱，实际记录请在当天填写。</p>}
      {(weight.error || water.error || checkin.error) && (
        <Button
          type="button"
          variant="secondary"
          loading={refreshing}
          onClick={() => void readLatest()}
        >
          读取最新记录，保留输入
        </Button>
      )}
      {notice && (
        <p role="status" className="quick-notice">
          {notice}
        </p>
      )}
    </section>
  );
}
