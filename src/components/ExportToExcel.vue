<template>
  <v-card flat class="transparent mx-auto mt-4 mb-12" max-width="960">
    <v-row justify="center" class="my-12">
      <v-col cols="4">
        <v-card class="transparent py-3 px-5" min-height="480">
          <v-row v-for="(prop, propName) in simple" :key="propName">
            <v-checkbox
              v-model="prop.selected"
              hide-details
              color="primary"
              :label="prop.header"
            />
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="4" v-for="(section, sectionName) of sections" :key="sectionName" max-width="360">
        <v-card class="transparent py-2 px-4" min-height="480">
          <h5>
            <small>{{ getSectionTitle(sectionName) }}</small>
          </h5>
          <div v-for="(prop, propName) in section" :key="propName">
            <v-checkbox
              v-model="prop.selected"
              hide-details
              color="primary"
              :label="prop.title"
            />
          </div>
        </v-card>
      </v-col>

      <v-col cols="4" max-width="360">
        <v-card class="transparent py-2 px-4" min-height="480">
          <h5>
            <small> Infrastructure </small>
          </h5>
          <div v-for="(prop, propName) in infrastructure" :key="propName">
            <v-checkbox
              v-model="prop.selected"
              hide-details
              color="primary"
              :label="prop.title"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-btn @click="createExcelTable" dark color="primary" class="mb-12">
        Create excel table
      </v-btn>
    </v-row>
  </v-card>
</template>

<script>

import {
  addressComponents,
  access,
  concierge,
  corporation,
  infrastructureFields,
  management,
  marketing,
  owner,
  simpleFields
} from '@/configs/buildingSchemaSections'

// const { buildingSchemaForExportToCsv } = require('@/configs').default

export default {
  name: 'CreateExcel',

  data: () => ({
    simple: simpleFields,

    sectionNames: ['addressComponents', 'access', 'concierge', 'corporation', 'management', 'owner', 'marketing'],
    schema: [
      addressComponents,
      access,
      concierge,
      corporation,
      management,
      owner,
      marketing
    ],
    infrastructure: infrastructureFields,
    sections: {}
  }),

  methods: {
    getSectionTitle (sectionName) {
      return sectionName === 'addressComponents'
        ? 'Address details'
        : sectionName.replace(sectionName[0], sectionName[0].toUpperCase())
    },

    createExcelTable () {
      const request = [
        { header: 'Address', width: 45, key: 'address' },
        { header: 'Status', width: 15, key: 'status' }
      ]

      for (const key in this.addressComponents) {
        if (this.addressComponents[key].selected) {
          request.push({
            header: this.addressComponents[key].header,
            key: `addressComponents.${key}`,
            width: this.addressComponents[key].width || 12
          })
        }
      }

      for (const key in this.simple) {
        if (this.simple[key].selected) {
          request.push({
            header: this.simple[key].header,
            key,
            width: this.simple[key].width || 12
          })
        }
      }

      for (const section in this.sections) {
        for (const key in this.sections[section]) {
          if (this.sections[section][key].selected) {
            request.push({
              header: this.sections[section][key].title,
              key: `${section}.${key}`,
              width: this.sections[section][key].width || 12
            })
          }
        }
      }

      for (const item in this.infrastructure) {
        if (this.infrastructure[item].selected) {
          if (this.infrastructure[item].children) {
            for (const child in this.infrastructure[item].children) {
              request.push({
                header: this.infrastructure[item].children[child].title,
                key: `infrastructure.${item}.${child}`,
                width: this.infrastructure[item].children[child].width || 5
              })
            }
          } else {
            request.push({
              header: this.infrastructure[item].title,
              key: `infrastructure.${item}`,
              width: this.infrastructure[item].width || 5
            })
          }
        }
      }

      this.__createBuildingExcelFile(request, this.excelFileCreated)
    },

    excelFileCreated (data) {
      // console.log('Link to excel file: ', data)
    }
  },

  beforeMount () {
    this.schema.forEach((section, index) => {
      this.sections[this.sectionNames[index]] = Object.assign({}, ...Object.keys(section).map(key => ({ [key]: { selected: false, title: section[key].title } })))
    })
  }
}
</script>
