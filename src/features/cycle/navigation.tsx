import { useMemo, useCallback } from 'react';
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  useSearchParams as routerSearch,
  useNavigate as routerNavigate,
  createSearchParams,
  type LinkProps,
  type NavLinkProps,
  type To,
  type NavigateOptions,
} from 'react-router-dom';
import { useCycle, cycleKey } from './CycleContext';
// Legacy deep links remain readable; API IDs live in context, never in displayed links.
export function cleanCycleTarget(to: To, cycle: ReturnType<typeof useCycle>): To {
  if (!cycle) return to;
  const path =
    typeof to === 'string' ? to : `${to.pathname ?? ''}${to.search ?? ''}${to.hash ?? ''}`;
  if (/^(https?:|mailto:)/.test(path)) return to;
  const [beforeHash, hash] = path.split('#');
  const [pathname, search] = beforeHash.split('?');
  const params = new URLSearchParams(search);
  params.delete('cycleId');
  params.delete('cycle');
  if (cycle.selected && cycle.cycleId !== cycle.defaultId)
    params.set('cycle', cycleKey(cycle.selected));
  return `${pathname}${params.size ? `?${params}` : ''}${hash === undefined ? '' : `#${hash}`}`;
}
export function Link(props: LinkProps) {
  const cycle = useCycle();
  return <RouterLink {...props} to={cleanCycleTarget(props.to, cycle)} />;
}
export function NavLink(props: NavLinkProps) {
  const cycle = useCycle();
  return <RouterNavLink {...props} to={cleanCycleTarget(props.to, cycle)} />;
}
export function useSearchParams(): ReturnType<typeof routerSearch> {
  const [params, setParams] = routerSearch();
  const cycle = useCycle();
  const id = cycle?.cycleId;
  const resolved = useMemo(() => {
    const value = new URLSearchParams(params);
    const originalGet = value.get.bind(value);
    value.get = (name) => (name === 'cycleId' && id !== undefined ? id || null : originalGet(name));
    return value;
  }, [params, id]);
  const update: ReturnType<typeof routerSearch>[1] = useCallback(
    (next, options) => {
      const value = typeof next === 'function' ? next(resolved) : next;
      const publicParams = createSearchParams(value);
      const requestedId = publicParams.get('cycleId');
      if (cycle && requestedId) {
        cycle.select(requestedId);
        return;
      }
      if (publicParams.toString() !== params.toString()) setParams(publicParams, options);
    },
    [cycle, resolved, params, setParams],
  );
  return [resolved, update];
}
export function useNavigate() {
  const navigate = routerNavigate();
  const cycle = useCycle();
  return ((to: To | number, options?: NavigateOptions) =>
    typeof to === 'number'
      ? navigate(to)
      : navigate(cleanCycleTarget(to, cycle), options)) as ReturnType<typeof routerNavigate>;
}
