import { useEffect, useMemo, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import {
  HOT_CITIES,
  TYPE_BADGE,
  clearRecent,
  getCity,
  loadRecent,
  pushRecent,
  searchPlaces,
  setPendingPick,
  toValue,
  type PickField,
  type Place,
  type PlaceValue,
  type SearchHit
} from '../../services/places';
import { locateCity, openLocationSetting, type LocateError } from '../../services/location';
import { travel } from '../../styles/tokens';
import './index.scss';

const PRESS = { hoverStartTime: 0, hoverStayTime: 80 } as const;
const TITLES: Record<PickField, string> = { from: '选择出发地', to: '选择目的地', via: '选择途经地' };

type LocState = { status: 'loading' } | { status: 'ok'; city: Place } | { status: 'error'; reason: LocateError };

export default function PlacePickerPage() {
  const router = useRouter();
  const field = (['from', 'to', 'via'].indexOf(router.params.field || '') >= 0 ? router.params.field : 'from') as PickField;
  const index = Number(router.params.index || 0) || 0;

  const [keyword, setKeyword] = useState('');
  const [recent, setRecent] = useState<PlaceValue[]>([]);
  const [loc, setLoc] = useState<LocState>({ status: 'loading' });

  const locate = () => {
    setLoc({ status: 'loading' });
    locateCity()
      .then((city) => setLoc({ status: 'ok', city }))
      .catch((reason: LocateError) => setLoc({ status: 'error', reason: reason === 'denied' ? 'denied' : 'failed' }));
  };

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: TITLES[field] });
    setRecent(loadRecent());
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => searchPlaces(keyword), [keyword]);
  const searching = keyword.trim().length > 0;

  const pick = (v: PlaceValue) => {
    pushRecent(v);
    setPendingPick({ field, index, value: v });
    Taro.navigateBack();
  };

  const pickCity = (name: string) => {
    const c = getCity(name);
    if (c) pick(toValue(c));
  };

  const onLocTap = () => {
    if (loc.status === 'ok') {
      pick(toValue(loc.city));
      return;
    }
    if (loc.status === 'error' && loc.reason === 'denied') {
      openLocationSetting().then(() => locate());
      return;
    }
    if (loc.status === 'error') locate();
  };

  const onClearRecent = () => {
    clearRecent();
    setRecent([]);
  };

  const renderHit = (h: SearchHit, i: number, all: SearchHit[]) => {
    const p = h.place;
    const sub =
      p.type === 'city'
        ? [p.stations ? `${p.stations} 个火车站` : '', p.airports ? `${p.airports} 个机场` : ''].filter(Boolean).join(' · ')
        : [p.city, p.code].filter(Boolean).join(' · ');
    return (
      <View key={p.id} className={`pp-item ${i === all.length - 1 ? 'pp-item-last' : ''}`} hoverClass='pp-item-press' {...PRESS} onClick={() => pick(toValue(p))}>
        <View className={`pp-badge pp-badge-${p.type}`}>
          <Text className={`pp-badge-text pp-badge-text-${p.type}`}>{TYPE_BADGE[p.type]}</Text>
        </View>
        <View className='pp-item-main'>
          <Text className='pp-item-name'>
            {h.segments.map((s, i) =>
              s.hit ? (
                <Text key={i} className='pp-hl'>
                  {s.text}
                </Text>
              ) : (
                <Text key={i}>{s.text}</Text>
              )
            )}
          </Text>
          {sub ? <Text className='pp-item-sub'>{sub}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View className='pp-page'>
      <View className='pp-bar'>
        <View className='pp-search'>
          <View className='pp-glass'>
            <View className='pp-glass-ring' />
            <View className='pp-glass-handle' />
          </View>
          <Input
            className='pp-input'
            focus
            value={keyword}
            placeholder='搜索城市 / 火车站 / 机场'
            placeholderClass='pp-placeholder'
            placeholderStyle={`color:${travel.ink4}`}
            onInput={(e) => setKeyword(e.detail.value)}
          />
          {keyword ? (
            <View className='pp-clear' onClick={() => setKeyword('')}>
              <Text className='pp-clear-text'>✕</Text>
            </View>
          ) : null}
        </View>
        <View className='pp-cancel' hoverClass='pp-cancel-press' {...PRESS} onClick={() => Taro.navigateBack()}>
          <Text className='pp-cancel-text'>取消</Text>
        </View>
      </View>

      {!searching ? (
        <View className='pp-body'>
          <View
            className={`pp-loc ${loc.status === 'error' ? 'pp-loc-error' : ''}`}
            hoverClass={loc.status === 'loading' ? 'none' : 'pp-loc-press'}
            {...PRESS}
            onClick={onLocTap}
          >
            <View className='pp-pin'>
              <View className={`pp-pin-dot ${loc.status === 'loading' ? 'pp-pin-dot-pulse' : ''}`} />
            </View>
            <Text className='pp-loc-label'>当前定位</Text>
            {loc.status === 'loading' ? <Text className='pp-loc-muted'>定位中…</Text> : null}
            {loc.status === 'ok' ? <Text className='pp-loc-city'>{loc.city.name}</Text> : null}
            {loc.status === 'error' ? <Text className='pp-loc-fail'>定位失败，点击重试</Text> : null}
          </View>

          {recent.length ? (
            <View className='pp-section'>
              <View className='pp-section-head'>
                <Text className='pp-section-title'>最近选择</Text>
                <View className='pp-section-action' onClick={onClearRecent}>
                  <Text className='pp-section-action-text'>清空</Text>
                </View>
              </View>
              <View className='pp-chips'>
                {recent.map((v) => (
                  <View key={v.id} className='pp-chip' hoverClass='pp-chip-press' {...PRESS} onClick={() => pick(v)}>
                    {v.type !== 'city' ? (
                      <Text className={`pp-chip-tag pp-badge-text-${v.type}`}>{TYPE_BADGE[v.type]}</Text>
                    ) : null}
                    <Text className='pp-chip-text'>{v.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View className='pp-section'>
            <View className='pp-section-head'>
              <Text className='pp-section-title'>热门城市</Text>
            </View>
            <View className='pp-grid'>
              {HOT_CITIES.map((c) => (
                <View key={c} className='pp-cell' hoverClass='pp-chip-press' {...PRESS} onClick={() => pickCity(c)}>
                  <Text className='pp-cell-text'>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : groups.length ? (
        <View className='pp-body'>
          {groups.map((g) => (
            <View key={g.type} className='pp-group'>
              <View className='pp-group-head'>
                <Text className='pp-group-title'>{g.title}</Text>
                <Text className='pp-group-count'>{g.items.length}</Text>
              </View>
              <View className='pp-list'>{g.items.map(renderHit)}</View>
            </View>
          ))}
        </View>
      ) : (
        <View className='pp-empty'>
          <View className='pp-empty-icon'>
            <View className='pp-glass pp-glass-lg'>
              <View className='pp-glass-ring pp-glass-ring-lg' />
              <View className='pp-glass-handle pp-glass-handle-lg' />
            </View>
          </View>
          <Text className='pp-empty-text'>没有找到相关地点</Text>
        </View>
      )}
    </View>
  );
}
