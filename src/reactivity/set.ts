import { AnyObject } from '../types/basic'
import { getVueConstructor } from '../runtimeContext'
import {
  isArray,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isObject,
  hasOwn,
} from '../utils'
import { defineAccessControl, mockReactivityDeep } from './reactive'

/**
 * Set a property on an object. Adds the new property, triggers change
 * notification and intercept it's subsequent access if the property doesn't
 * already exist.
 */
export function set<T>(target: AnyObject, key: any, val: T): T {
  const Vue = getVueConstructor()
  // @ts-expect-error https://github.com/vuejs/vue/pull/12132
  const { warn, defineReactive } = Vue.util
  if (__DEV__ && (isUndef(target) || isPrimitive(target))) {
    warn(
      `Cannot set reactive property on undefined, null, or primitive value: ${target}`
    )
  }
  if (isArray(target)) {
    if (isValidArrayIndex(key)) {
      target.length = Math.max(target.length, key)
      target.splice(key, 1, val)
      return val
    } else if (key === 'length' && (val as any) !== target.length) {
      target.length = val as any
      ;(target as any).__ob__?.dep.notify()
      return val
    }
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = target.__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    __DEV__ &&
      warn(
        'Avoid adding reactive properties to a Vue instance or its root $data ' +
          'at runtime - declare it upfront in the data option.'
      )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  // IMPORTANT: define access control before trigger watcher
  defineAccessControl(target, key, val)

  // in SSR, there is no __ob__. Mock for reactivity check
  if (isObject(target[key]) && !hasOwn(target[key], '__ob__')) {
    mockReactivityDeep(target[key])
  }

  ob.dep.notify()
  return val
}
