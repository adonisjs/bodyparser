[@adonisjs/bodyparser](../README.md) > ["src/FormFields/index"](../modules/_src_formfields_index_.md) > [FormFields](../classes/_src_formfields_index_.formfields.md)

# Class: FormFields

A jar of form fields to store form data by handling array gracefully

## Hierarchy

**FormFields**

## Index

### Methods

* [add](_src_formfields_index_.formfields.md#add)
* [get](_src_formfields_index_.formfields.md#get)

---

## Methods

<a id="add"></a>

###  add

▸ **add**(key: *`string`*, value: *`any`*): `void`

Add a new key/value pair. The keys with array like expressions are handled properly.

*__example__*:
 ```
formfields.add('username', 'virk')

// array
formfields.add('username[]', 'virk')
formfields.add('username[]', 'nikk')

// Indexed keys are orderd properly
formfields.add('username[1]', 'virk')
formfields.add('username[0]', 'nikk')
```

**Parameters:**

| Name | Type |
| ------ | ------ |
| key | `string` |
| value | `any` |

**Returns:** `void`

___
<a id="get"></a>

###  get

▸ **get**(): `any`

Returns the copy of form fields

**Returns:** `any`

___

